(function () {
  'use strict';
  var RelationRepository = require('./relation_repository').RelationRepository,
    Strategy = require('./strategy').Strategy,
    constructRoute = require('./construct_route').constructRoute,
    wrapServiceAction = require('./wrap_service_action').wrapServiceAction,
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
    FollowToEntityToMany,
    FollowFromRepositoryToService;

  ConnectEntityToService = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'service',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      constructRoute({
        controller: controller,
        verb: to.verb,
        url: to.urlTemplate,
        action: wrapServiceAction(to),
        relation: relation,
        body: false,
        path: true
      });
    }
  });

  ModifyAnEntity = Strategy.extend({
    type: 'modify',
    from: 'entity',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from) {
      var action = function (req, res) {
        var id = req.params('id'),
          patch = req.params(from.name),
          result;

        from.repository.updateById(id, patch.forDB());
        result = from.repository.byIdWithNeighbors(id);

        res.json(result.forClient());
      };

      constructRoute({
        controller: controller,
        verb: 'patch',
        url: from.urlTemplate,
        action: action,
        relation: relation,
        body: from,
        path: true
      });
    }
  });

  ConnectTwoEntities = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.replaceRelation(req.params('id'), req.body()[relation.name]);
          res.status(204);
        };

      constructRoute({
        controller: controller,
        verb: 'post',
        url: from.urlForRelation(relation),
        action: action,
        relation: relation,
        path: true,
        body: false
      });
    }
  });

  ConnectTwoEntitiesToMany = Strategy.extend({
    type: 'connect',
    from: 'entity',
    to: 'entity',
    cardinality: 'many',

    execute: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.addRelations(req.params('id'), req.body()[relation.name]);
          res.status(204);
        };

      constructRoute({
        controller: controller,
        verb: 'post',
        url: from.urlForRelation(relation),
        action: action,
        relation: relation,
        path: true,
        body: false
      });
    }
  });

  DisconnectTwoEntities = Strategy.extend({
    type: 'disconnect',
    from: 'entity',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var relationRepository = new RelationRepository(from, to, relation, graph),
        action = function (req, res) {
          relationRepository.deleteRelation(req.params('id'));
          res.status(204);
        };

      constructRoute({
        controller: controller,
        verb: 'delete',
        url: from.urlForRelation(relation),
        action: action,
        relation: relation,
        path: true,
        body: false
      });
    }
  });

  DisconnectTwoEntitiesToMany = Strategy.extend({
    type: 'disconnect',
    from: 'entity',
    to: 'entity',
    cardinality: 'many',

    execute: function (controller, graph, relation, from, to) {}
  });


  FollowToEntity = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {},
  });

  FollowToEntityToMany = Strategy.extend({
    type: 'follow',
    from: 'entity',
    to: 'entity',
    cardinality: 'many',

    execute: function (controller, graph, relation, from, to) {}
  });

  AddEntityToRepository = Strategy.extend({
    type: 'connect',
    from: 'repository',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var action = function (req, res) {
        var data = {},
          model = req.params(to.name);

        data[to.name] = from.repository.save(model).forClient();
        res.status(201);
        res.json(data);
      };

      from.addActionWithMethodForRelation('POST', relation);

      constructRoute({
        controller: controller,
        verb: 'post',
        url: from.urlTemplate,
        action: action,
        relation: relation,
        path: false,
        body: to
      });
    }
  });

  ConnectRepoWithEntity = Strategy.extend({
    type: 'follow',
    from: 'repository',
    to: 'entity',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var action = function (req, res) {
        var id = req.params('id'),
          entry = from.repository.byIdWithNeighbors(id);

        res.json(entry.forClient());
      };

      constructRoute({
        controller: controller,
        verb: 'get',
        url: to.urlTemplate,
        action: action,
        relation: relation,
        path: true,
        body: false
      });

      from.addLinkToEntities(relation, to);
    }
  });

  ConnectStartWithRepository = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'repository',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var action = function (req, res) {
        res.json({
          properties: to.properties(),
          entities: to.entities(),
          links: to.filteredLinks(req),
          actions: to.filteredActions(req)
        });
      };

      from.addLinkViaTransitionTo(relation, to);

      constructRoute({
        controller: controller,
        verb: 'get',
        url: to.urlTemplate,
        action: action,
        relation: relation,
        path: false,
        body: false
      });
    }
  });

  ConnectToService = Strategy.extend({
    type: 'follow',
    from: 'start',
    to: 'service',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      from.addLinkViaTransitionTo(relation, to);

      constructRoute({
        controller: controller,
        verb: to.verb,
        url: to.urlTemplate,
        action: to.action,
        relation: relation,
        path: false,
        body: to
      });
    }
  });

  FollowFromRepositoryToService = Strategy.extend({
    type: 'follow',
    from: 'repository',
    to: 'service',
    cardinality: 'one',

    execute: function (controller, graph, relation, from, to) {
      var action = wrapServiceAction(to);

      from.addLinkViaTransitionTo(relation, to);

      constructRoute({
        controller: controller,
        verb: to.verb,
        url: to.urlTemplate,
        action: action,
        relation: relation,
        path: false,
        body: false // TODO: is it false?
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
      new ConnectStartWithRepository(),
      new FollowFromRepositoryToService()
    ]
  };
}());
