/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    extend = require('org/arangodb/extend').extend,
    // ArangoError = require('internal').ArangoError,
    BaseTransition = require('./base_transition').BaseTransition,
    BaseState = require('./state').State,
    VertexNotFound = require('./graph').VertexNotFound,
    RepositoryWithGraph = require('./repository_with_graph').RepositoryWithGraph,
    ConditionNotFulfilled = require('./condition_not_fulfilled').ConditionNotFulfilled,
    RelationRepository = require('./relation_repository').RelationRepository,
    report = require('./reporter').report,
    Transition,
    State,
    Model,
    Repository,
    Strategy,
    ModifyAnEntity,
    AddEntityToRepository,
    ConnectRepoWithEntity,
    ConnectStartWithRepository,
    ConnectToService,
    DisconnectTwoEntities,
    ConnectEntityToService,
    ConnectTwoEntities,
    FollowToEntity,
    strategies,
    Context;

  Strategy = function () {
  };

  _.extend(Strategy.prototype, {
    executable: function (type, from, to) {
      return type === this.type && from === this.from && to === this.to;
    },

    prepare: function () {
      report('Nothing to prepare with type %s from %s to %s', this.type, this.from, this.to);
    },

    /*jshint maxlen: 200 */
    executeOneToOne: function () {
      report('Nothing to execute for one to one with type %s from %s to %s', this.type, this.from, this.to);
    },

    executeOneToMany: function () {
      report('Nothing to execute for one to many with type %s from %s to %s', this.type, this.from, this.to);
    },
    /*jshint maxlen: 100 */
  });

  Strategy.extend = extend;

  ConnectEntityToService = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'service',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, entityState, serviceState) {
      var url = entityState.urlFor(':entityId') + '/' + relation.name,
        nameOfRootElement = entityState.name,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters }),
        verb = serviceState.verb,
        repository = entityState.repository;

      controller[verb](url, function (req, res) {
        var id = req.params('entityId'),
          entity = repository.byId(id);

        req.parameters.entity = entity;
        serviceState.action(req, res);
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .pathParam('entityId', {
          description: 'ID of the entity',
          type: 'string'
        })
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  ModifyAnEntity = Strategy.extend({
    type: 'modify',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, entityState) {
      var url = entityState.urlFor(':entityId'),
        nameOfRootElement = entityState.name,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters }),
        repository = entityState.repository;

      controller.patch(url, function (req, res) {
        var id = req.params('entityId'),
          patch = req.params(nameOfRootElement),
          result;

        repository.updateById(id, patch.forDB());
        result = repository.byIdWithNeighbors(id);

        res.json(result.forClient());
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .pathParam('entityId', {
          description: 'ID of the entity',
          type: 'string'
        })
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  ConnectTwoEntities = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var url = from.urlFor(':entityId') + '/links/' + relation.name,
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(url, function (req, res) {
        relationRepository.replaceRelation(req.params('entityId'), req.body()[relation.name]);
        res.status(204);
      }).pathParam('entityId', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(VertexNotFound, 404, 'The vertex could not be found')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    },

    executeOneToMany: function (controller, graph, relation, from, to) {
      var url = from.urlFor(':entityId') + '/links/' + relation.name,
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(url, function (req, res) {
        relationRepository.addRelations(req.params('entityId'), req.body()[relation.name]);
        res.status(204);
      }).pathParam('entityId', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(VertexNotFound, 404, 'The vertex could not be found')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  DisconnectTwoEntities = Strategy.extend({
    type: 'disconnect',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var url = from.urlFor(':entityId') + '/links/' + relation.name,
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.delete(url, function (req, res) {
        relationRepository.deleteRelation(req.params('entityId'));
        res.status(204);
      }).pathParam('entityId', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(VertexNotFound, 404, 'The vertex could not be found')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  FollowToEntity = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {},
    executeOneToMany: function (controller, graph, relation, from, to) {}
  });

  AddEntityToRepository = Strategy.extend({
    type: 'connect',
    from: 'repository',
    to: 'entity',

    prepare: function (from, to) {
      to.collectionName = from.collectionName;
      to.repository = from.repository;
    },

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var nameOfRootElement = entityState.name,
        repository = repositoryState.repository,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters }),
        href = repositoryState.urlTemplate,
        name = relation.name,
        precondition = relation.precondition,
        method = 'POST',
        fields,
        title = relation.summary;

      fields = _.map(relation.parameters, function (joi, name) {
        var fieldDescription = { name: name, type: joi._type };

        if (!_.isNull(joi._description)) {
          fieldDescription.description = joi._description;
        }

        if (!_.isUndefined(joi._flags.default)) {
          fieldDescription.value = joi._flags.default;
        }

        return fieldDescription;
      });

      repositoryState.addAction(name, method, href, title, fields, precondition);

      controller.post(href, function (req, res) {
        var data = {},
          model = req.params(nameOfRootElement);

        data[nameOfRootElement] = repository.save(model).forClient();
        res.status(201);
        res.json(data);
      }).bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  ConnectRepoWithEntity = Strategy.extend({
    type: 'follow',
    from: 'repository',
    to: 'entity',

    prepare: function (from, to) {
      var repository = from.repository;
      repository.relations = to.relations;
    },

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var rel = relation.name,
        href = entityState.urlTemplate,
        title = relation.summary,
        repository = repositoryState.repository;

      controller.get(href, function (req, res) {
        var id = req.params('id'),
          entry = repository.byIdWithNeighbors(id);

        res.json(entry.forClient());
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);

      repositoryState.addLinkToEntities(rel, href, title, entityState);
    }
  });

  ConnectStartWithRepository = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'repository',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        href = to.urlTemplate,
        precondition = relation.precondition,
        title = relation.summary;

      from.addLink([rel], href, title, precondition);

      controller.get(href, function (req, res) {
        res.json({
          properties: to.properties(),
          entities: to.entities(),
          links: to.filteredLinks(req),
          actions: to.filteredActions(req)
        });
      }).summary(relation.summary)
        .notes(relation.notes)
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition);
    }
  });

  ConnectToService = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'service',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        href = to.urlTemplate,
        title = relation.summary,
        verb = to.verb,
        action = to.action,
        nameOfRootElement = to.name,
        precondition = relation.precondition,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      from.addLink([rel], href, title, precondition);

      controller[verb](href, action)
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  strategies = [
    new ModifyAnEntity(),
    new ConnectTwoEntities(),
    new DisconnectTwoEntities(),
    new FollowToEntity(),
    new AddEntityToRepository(),
    new ConnectRepoWithEntity(),
    new ConnectEntityToService(),
    new ConnectToService(),
    new ConnectStartWithRepository()
  ];

  /*jshint maxlen: 200 */
  Context = function (type, from, to) {
    this.strategy = _.find(strategies, function (maybeStrategy) {
      return maybeStrategy.executable(type, from, to);
    });

    if (_.isUndefined(this.strategy)) {
      require('console').log('Couldn\'t find a strategy for semantic %s from %s to %s', type, from, to);
      throw 'Could not find strategy';
    }
  };
  /*jshint maxlen: 100 */

  _.extend(Context.prototype, {
    prepare: function (from, to) {
      this.strategy.prepare(from, to);
    },

    executeOneToOne: function (controller, graph, relation, from, to) {
      this.strategy.executeOneToOne(controller, graph, relation, from, to);
    },

    executeOneToMany: function (controller, graph, relation, from, to) {
      this.strategy.executeOneToMany(controller, graph, relation, from, to);
    }
  });

  Repository = RepositoryWithGraph.extend({
  });

  Model = Foxx.Model.extend({
    forClient: function () {
      var properties = Foxx.Model.prototype.forClient.call(this);

      return {
        properties: properties,
        links: []
      };
    }
  });

  State = BaseState.extend({
    addRepository: function (Repository, states) {
      this.type = 'repository';
      var elementRelation = this.findTransitionByType('connect'),
        ModelForRepo = states[elementRelation.to].model;

      this.collection = this.graph.addVertexCollection(this.name);
      this.collectionName = this.collection.name();

      this.repository = new Repository(this.collection, {
        model: ModelForRepo,
        graph: this.graph
      });
    },

    setAsStart: function (controller) {
      var that = this;

      controller.get('/', function (req, res) {
        res.json({
          properties: {},
          links: that.filteredLinks(req),
          actions: that.filteredActions(req)
        });
      }).summary('Billboard URL')
        .notes('This is the starting point for using the API');
      this.type = 'start';
    },

    properties: function () {
      return {};
    },

    entities: function () {
      var entities = [];

      if (this.type === 'repository') {
        entities = _.map(this.repository.all(), function (entity) {
          var result = entity.forClient();

          _.each(this.childLinks, function (link) {
            result.links.push({
              rel: link.rel,
              href: link.target.urlFor(entity.get('_key')),
              title: link.title
            });
          });
          return result;
        }, this);
      }

      return entities;
    },

    filteredLinks: function (req) {
      return _.filter(this.links, function (link) {
        return link.precondition(req);
      });
    },

    filteredActions: function (req) {
      return _.filter(this.actions, function (action) {
        return action.precondition(req);
      });
    },

    addLink: function (rel, href, title, precondition) {
      this.links.push({
        precondition: precondition,
        rel: rel,
        href: href,
        title: title
      });
    },

    addLinkToEntities: function (rel, href, title, target) {
      this.childLinks.push({
        rel: rel,
        href: href,
        title: title,
        target: target
      });
    },

    addAction: function (name, method, href, title, fields, precondition) {
      this.actions.push({
        precondition: precondition,
        name: name,
        // class: ?,
        method: method,
        href: href,
        title: title,
        type: 'application/json',
        fields: fields
      });
    }
  });

  Transition = BaseTransition.extend({
    prepare: function (from, to) {
      var context = new Context(this.type, from.type, to.type);
      context.prepare(from, to);
    },

    addRoutesForOneRelation: function (controller, graph, relation, from, to) {
      var context = new Context(this.type, from.type, to.type);
      context.executeOneToOne(controller, graph, relation, from, to);
    },

    addRoutesForManyRelation: function (controller, graph, relation, from, to) {
      var context = new Context(this.type, from.type, to.type);
      context.executeOneToMany(controller, graph, relation, from, to);
    }
  });

  exports.mediaType = {
    Model: Model,
    Repository: Repository,
    Transition: Transition,
    State: State,
    transitions: []
  };
}());
