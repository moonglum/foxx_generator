(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    VertexNotFound = require('./vertex_not_found').VertexNotFound,
    ConditionNotFulfilled = require('./condition_not_fulfilled').ConditionNotFulfilled,
    RelationRepository = require('./relation_repository').RelationRepository,
    Strategy = require('./strategy').Strategy,
    joi = require('joi'),
    ModifyAnEntity,
    AddEntityToRepository,
    ConnectRepoWithEntity,
    ConnectStartWithRepository,
    ConnectToService,
    DisconnectTwoEntities,
    ConnectEntityToService,
    ConnectTwoEntities,
    FollowToEntity;

  ConnectEntityToService = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'service',
    relation: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, entityState, serviceState) {
      controller[serviceState.verb](serviceState.urlTemplate, function (req, res) {
        var id = req.params('id'),
          entity = entityState.repository.byId(id);

        var opts = {
          superstate: {
            entity: entity
          }
        };
        serviceState.action(req, res, opts);
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .pathParam('id', joi.string().description('ID of the entity'))
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
      var BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      controller.patch(entityState.urlTemplate, function (req, res) {
        var id = req.params('id'),
          patch = req.params(entityState.name),
          result;

        entityState.repository.updateById(id, patch.forDB());
        result = entityState.repository.byIdWithNeighbors(id);

        res.json(result.forClient());
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .pathParam('id', joi.string().description('ID of the entity'))
        .bodyParam(entityState.name, 'TODO', BodyParam)
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
      var relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(from.urlForRelation(relation), function (req, res) {
        relationRepository.replaceRelation(req.params('id'), req.body()[relation.name]);
        res.status(204);
      }).pathParam('id', joi.string().description('ID of the document'))
        .errorResponse(VertexNotFound, 404, 'The vertex could not be found')
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    },

    executeOneToMany: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(from.urlForRelation(relation), function (req, res) {
        relationRepository.addRelations(req.params('id'), req.body()[relation.name]);
        res.status(204);
      }).pathParam('id', joi.string().description('ID of the document'))
        .errorResponse(VertexNotFound, 404, 'The vertex could not be found')
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
      var relationRepository = new RelationRepository(from, to, relation, graph);

      controller.delete(from.urlForRelation(relation), function (req, res) {
        relationRepository.deleteRelation(req.params('id'));
        res.status(204);
      }).pathParam('id', joi.string().description('ID of the document'))
        .errorResponse(VertexNotFound, 404, 'The vertex could not be found')
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

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var repository = repositoryState.repository,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters }),
        url = repositoryState.urlTemplate,
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

      repositoryState.addAction(name, method, url, title, fields, precondition);

      controller.post(url, function (req, res) {
        var data = {},
          model = req.params(entityState.name);

        data[entityState.name] = repository.save(model).forClient();
        res.status(201);
        res.json(data);
      }).bodyParam(entityState.name, 'TODO', BodyParam)
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
      controller.get(entityState.urlTemplate, function (req, res) {
        var id = req.params('id'),
          entry = repositoryState.repository.byIdWithNeighbors(id);

        res.json(entry.forClient());
      }).pathParam('id', joi.string().description('ID of the document'))
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);

      repositoryState.addLinkToEntities(relation, entityState);
    }
  });

  ConnectStartWithRepository = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'repository',

    executeOneToOne: function (controller, graph, relation, from, to) {
      from.addLinkViaTransitionTo(relation, to);

      controller.get(to.urlTemplate, function (req, res) {
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
      var BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      from.addLinkViaTransitionTo(relation, to);

      controller[to.verb](to.urlTemplate, to.action)
        .bodyParam(to.name, 'TODO', BodyParam)
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);
    }
  });

  exports.mediaType = {
    strategies: [
      new ModifyAnEntity(),
      new ConnectTwoEntities(),
      new DisconnectTwoEntities(),
      new FollowToEntity(),
      new AddEntityToRepository(),
      new ConnectRepoWithEntity(),
      new ConnectEntityToService(),
      new ConnectToService(),
      new ConnectStartWithRepository()
    ]
  };
}());
