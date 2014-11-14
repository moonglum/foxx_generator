(function () {
  'use strict';
  var RelationRepository = require('./relation_repository').RelationRepository,
    Strategy = require('./strategy').Strategy,
    constructRoute = require('./construct_route').constructRoute,
    ModifyAnEntity,
    AddEntityToRepository,
    ConnectRepoWithEntity,
    ConnectStartWithRepository,
    ConnectToService,
    DisconnectTwoEntities,
    DisconnectTwoEntitiesToMany,
    ConnectEntityToService,
    ConnectTwoEntities,
    ConnectTwoEntitiesToMany,
    FollowToEntity,
    FollowToEntityToMany;

  ConnectEntityToService = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'service',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, entityState, serviceState) {
      var action = function (req, res) {
        var id = req.params('id'),
          entity = entityState.repository.byId(id),
          opts = { superstate: { entity: entity } };

        serviceState.action(req, res, opts);
      };

      constructRoute(controller, serviceState.verb, serviceState.urlTemplate, action, relation, {
        body: false,
        path: true
      });
    }
  });

  ModifyAnEntity = Strategy.extend({
    type: 'modify',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, entityState) {
      var action = function (req, res) {
        var id = req.params('id'),
          patch = req.params(entityState.name),
          result;

        entityState.repository.updateById(id, patch.forDB());
        result = entityState.repository.byIdWithNeighbors(id);

        res.json(result.forClient());
      };

      constructRoute(controller, 'patch', entityState.urlTemplate, action, relation, {
        body: entityState,
        path: true
      });
    }
  });

  ConnectTwoEntities = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.replaceRelation(req.params('id'), req.body()[relation.name]);
          res.status(204);
        };

      constructRoute(controller, 'post', from.urlForRelation(relation), action, relation, {
        path: true,
        body: false
      });
    }
  });

  ConnectTwoEntitiesToMany = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-many',

    executeOneToMany: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.addRelations(req.params('id'), req.body()[relation.name]);
          res.status(204);
        };

      constructRoute(controller, 'post', from.urlForRelation(relation), action, relation, {
        path: true,
        body: false
      });
    }
  });

  DisconnectTwoEntities = Strategy.extend({
    type: 'disconnect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.deleteRelation(req.params('id'));
          res.status(204);
        };

      constructRoute(controller, 'delete', from.urlForRelation(relation), action, relation, {
        path: true,
        body: false
      });
    }
  });

  DisconnectTwoEntitiesToMany = Strategy.extend({
    type: 'disconnect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-many',

    executeOneToOne: function (controller, graph, relation, from, to) {}
  });


  FollowToEntity = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {},
  });

  FollowToEntityToMany = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'entity',
    cardinality: 'one-to-many',

    executeOneToMany: function (controller, graph, relation, from, to) {}
  });

  AddEntityToRepository = Strategy.extend({
    type: 'connect',
    from: 'repository',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var action = function (req, res) {
        var data = {},
          model = req.params(entityState.name);

        data[entityState.name] = repositoryState.repository.save(model).forClient();
        res.status(201);
        res.json(data);
      };

      repositoryState.addActionWithMethodForRelation('POST', relation);

      constructRoute(controller, 'post', repositoryState.urlTemplate, action, relation, {
        path: false,
        body: entityState
      });
    }
  });

  ConnectRepoWithEntity = Strategy.extend({
    type: 'follow',
    from: 'repository',
    to: 'entity',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, repositoryState, entityState) {
      var action = function (req, res) {
        var id = req.params('id'),
          entry = repositoryState.repository.byIdWithNeighbors(id);

        res.json(entry.forClient());
      };

      constructRoute(controller, 'get', entityState.urlTemplate, action, relation, {
        path: true,
        body: false
      });

      repositoryState.addLinkToEntities(relation, entityState);
    }
  });

  ConnectStartWithRepository = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'repository',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      var action = function (req, res) {
        res.json({
          properties: to.properties(),
          entities: to.entities(),
          links: to.filteredLinks(req),
          actions: to.filteredActions(req)
        });
      };

      from.addLinkViaTransitionTo(relation, to);

      constructRoute(controller, 'get', to.urlTemplate, action, relation, {
        path: false,
        body: false
      });
    }
  });

  ConnectToService = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'service',
    cardinality: 'one-to-one',

    executeOneToOne: function (controller, graph, relation, from, to) {
      from.addLinkViaTransitionTo(relation, to);

      constructRoute(controller, to.verb, to.urlTemplate, to.action, relation, {
        path: false,
        body: to
      });
    }
  });

  exports.mediaType = {
    strategies: [
      new ModifyAnEntity(),
      new ConnectTwoEntities(),
      new DisconnectTwoEntities(),
      new DisconnectTwoEntitiesToMany(),
      new FollowToEntity(),
      new FollowToEntityToMany(),
      new AddEntityToRepository(),
      new ConnectRepoWithEntity(),
      new ConnectEntityToService(),
      new ConnectToService(),
      new ConnectTwoEntitiesToMany(),
      new ConnectStartWithRepository()
    ]
  };
}());
