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
    ConditionNotFulfilled = require('./base_transition').ConditionNotFulfilled,
    RelationRepository = require('./relation_repository').RelationRepository,
    Transition,
    State,
    Model,
    Repository,
    Strategy,
    AddEntityToRepository,
    LinkFromRepoToEntity,
    Link,
    LinkToService,
    UnlinkTwoEntities,
    LinkToAsyncService,
    LinkTwoEntities,
    strategies,
    Context;

  Strategy = function () {
    this.type = 'strategy';
  };

  _.extend(Strategy.prototype, {
    executable: function (semantics, from, to) {
      return semantics === this.semantics && from === this.from && to === this.to;
    }
  });

  Strategy.extend = extend;

  LinkTwoEntities = Strategy.extend({
    semantics: 'link',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    prepare: function () {},

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
        .summary('Set the relation')
        .notes('TODO');
    }
  });

  UnlinkTwoEntities = Strategy.extend({
    semantics: 'unlink',
    from: 'entity',
    to: 'entity',
    relation: 'one-to-one',

    prepare: function () {},

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
        .summary('Remove the relation')
        .notes('TODO');
    }
  });

  AddEntityToRepository = Strategy.extend({
    semantics: 'link',
    from: 'repository',
    to: 'entity',

    prepare: function (from, to) {
      to.collectionName = from.collectionName;
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
        title = relation.description;

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
        .summary(relation.description)
        .notes('TODO');
    }
  });

  LinkFromRepoToEntity = Strategy.extend({
    semantics: 'follow',
    from: 'repository',
    to: 'entity',

    prepare: function (from, to) {
    },

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var rel = relation.name,
        href = entityState.urlTemplate,
        title = relation.description,
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
        .summary(relation.description)
        .notes('TODO');

      repositoryState.addLinkToEntities(rel, href, title, entityState);
    }
  });

  Link = Strategy.extend({
    semantics: 'follow',
    from: 'start',
    to: 'repository',

    prepare: function (from, to) {
    },

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        href = to.urlTemplate,
        precondition = relation.precondition,
        title = relation.description;

      from.addLink([rel], href, title, precondition);

      controller.get(href, function (req, res) {
        res.json({
          properties: to.properties(),
          entities: to.entities(),
          links: to.filteredLinks(req),
          actions: to.filteredActions(req)
        });
      }).summary(relation.description)
        .notes('TODO')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition);
    }
  });

  LinkToService = Strategy.extend({
    semantics: 'link',
    from: 'start',
    to: 'service',

    prepare: function (from, to) {
    },

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        href = to.urlTemplate,
        title = relation.description,
        verb = to.verb,
        action = to.action,
        nameOfRootElement = to.name,
        precondition = relation.precondition,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      from.addLink([rel], href, title, precondition);

      controller[verb](href, action)
        .summary(relation.description)
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .notes('TODO')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition);
    }
  });

  LinkToAsyncService = Strategy.extend({
    semantics: 'link',
    from: 'start',
    to: 'asyncService',

    prepare: function (from, to) {
    },

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        href = to.urlTemplate,
        title = relation.description,
        verb = to.verb,
        executeAsync = to.executeAsync,
        nameOfRootElement = to.name,
        precondition = relation.precondition,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      from.addLink([rel], href, title, precondition);

      controller[verb](href, function (req, res) {
        var params = req.params(nameOfRootElement);

        executeAsync(params.forClient());

        res.status(201);
        res.json({
          job: 'created'
        });
      }).summary(relation.description)
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
        .notes('TODO')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition);
    }
  });

  strategies = [
    new LinkTwoEntities(),
    new UnlinkTwoEntities(),
    new AddEntityToRepository(),
    new LinkFromRepoToEntity(),
    new LinkToService(),
    new LinkToAsyncService(),
    new Link()
  ];

  Context = function (semantics, from, to) {
    this.strategy = _.find(strategies, function (maybeStrategy) {
      return maybeStrategy.executable(semantics, from, to);
    });

    if (_.isUndefined(this.strategy)) {
      require('console').log('Couldn\'t find a strategy for semantic %s from %s to %s', semantics, from, to);
      throw 'Could not find strategy';
    }
  };

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
      var elementRelation = this.findTransitionBySemantics('link'),
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
        .notes('TODO');
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
      var context = new Context(this.semantics, from.type, to.type);
      context.prepare(from, to);
    },

    addRoutesForOneRelation: function (controller, graph, relation, from, to) {
      var context = new Context(this.semantics, from.type, to.type);
      context.executeOneToOne(controller, graph, relation, from, to);
    },

    addRoutesForManyRelation: function (controller, graph, relation, from, to) {
      var context = new Context(this.semantics, from.type, to.type);
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
