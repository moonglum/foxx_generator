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
      var url = serviceState.urlTemplate,
        verb = serviceState.verb,
        repository = entityState.repository;

      controller[verb](url, function (req, res) {
        var id = req.params('id'),
          entity = repository.byId(id);

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
      var url = entityState.urlTemplate,
        nameOfRootElement = entityState.name,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters }),
        repository = entityState.repository;

      controller.patch(url, function (req, res) {
        var id = req.params('id'),
          patch = req.params(nameOfRootElement),
          result;

        repository.updateById(id, patch.forDB());
        result = repository.byIdWithNeighbors(id);

        res.json(result.forClient());
      }).errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .pathParam('id', joi.string().description('ID of the entity'))
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
      var url = from.urlForRelation(relation),
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(url, function (req, res) {
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
      var url = from.urlForRelation(relation),
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.post(url, function (req, res) {
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
      var url = from.urlForRelation(relation),
        relationRepository = new RelationRepository(from, to, relation, graph);

      controller.delete(url, function (req, res) {
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
      var nameOfRootElement = entityState.name,
        repository = repositoryState.repository,
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
        url = entityState.urlTemplate,
        title = relation.summary,
        repository = repositoryState.repository;

      controller.get(url, function (req, res) {
        var id = req.params('id'),
          entry = repository.byIdWithNeighbors(id);

        res.json(entry.forClient());
      }).pathParam('id', joi.string().description('ID of the document'))
        .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
        .onlyIf(relation.condition)
        .summary(relation.summary)
        .notes(relation.notes);

      repositoryState.addLinkToEntities(rel, url, title, entityState);
    }
  });

  ConnectStartWithRepository = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'repository',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var rel = relation.name,
        url = to.urlTemplate,
        precondition = relation.precondition,
        title = relation.summary;

      from.addLink([rel], url, title, precondition);

      controller.get(url, function (req, res) {
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
        url = to.urlTemplate,
        title = relation.summary,
        verb = to.verb,
        action = to.action,
        nameOfRootElement = to.name,
        precondition = relation.precondition,
        BodyParam = Foxx.Model.extend({ schema: relation.parameters });

      from.addLink([rel], url, title, precondition);

      controller[verb](url, action)
        .bodyParam(nameOfRootElement, 'TODO', BodyParam)
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
