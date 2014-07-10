/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    ArangoError = require('internal').ArangoError,
    JsonApiModel,
    JsonApiRepository,
    ElementTransition,
    ContainerTransition,
    ReplaceOperation,
    transitions = [];

  JsonApiRepository = Foxx.Repository.extend({
    updateByIdWithOperations: function (id, operations) {
      var model = this.byId(id);
      _.each(operations, function (operation) {
        operation.execute(model);
      });
      return this.replace(model);
    },

    allWithNeighbors: function (options) {
      var results = this.all(options);
      _.each(results, this.addLinks);
      return results;
    },

    byIdWithNeighbors: function (key) {
      var result = this.byId(key);
      this.addLinks(result);
      return result;
    },

    addLinks: function (model) {
      var links = {},
        graph = this.graph,
        relationNames = this.relationNames;

      _.each(relationNames, function (relation) {
        var neighbors = graph._neighbors(model.id, {
          edgeCollectionRestriction: [relation.edgeCollectionName]
        });

        if (relation.type === 'one') {
          links[relation.relationName] = neighbors[0]._key;
        } else if (relation.type === 'many') {
          links[relation.relationName] = _.pluck(neighbors, '_key');
        }
      });

      model.set('links', links);
    }
  });

  JsonApiModel = Foxx.Model.extend({
    forClient: function () {
      var attributes = Foxx.Model.prototype.forClient.call(this);
      return _.extend({ id: this.get('_key') }, attributes);
    }
  });

  ReplaceOperation = Foxx.Model.extend({
    isValid: function () {
      return (this.get('op') === 'replace');
    },

    execute: function (model) {
      model.set(this.getAttributeName(), this.get('value'));
    },

    // Fake implementation
    getAttributeName: function () {
      return this.get('path').split('/').pop();
    }
  }, {
    op: { type: 'string', required: true },
    path: { type: 'string', required: true },
    value: { type: 'string', required: true }
  });

  ElementTransition = function (appContext, graph, controller, states) {
    this.appContext = appContext;
    this.graph = graph;
    this.controller = controller;
    this.states = states;
  };

  _.extend(ElementTransition.prototype, {
    apply: function (from, to) {
      var entryPath = '/' + from.name + '/:id',
        collectionPath = '/' + from.name,
        perPage = 10,
        repository = from.repository,
        nameOfRootElement = from.name,
        Model = to.model,
        attributes = Model.attributes,
        BodyParam = Foxx.Model.extend({}, { attributes: attributes });

      repository.relationNames = to.relationNames;

      this.controller.get(collectionPath, function (req, res) {
        var data = {},
          page = req.params('page') || 0,
          skip = page * perPage,
          options = { skip: skip, limit: perPage };

        data[nameOfRootElement] = _.map(repository.allWithNeighbors(options), function (datum) {
          return datum.forClient();
        });
        res.json(data);
      }).queryParam('page', {
        description: 'Page of the results',
        type: 'int'
      }).summary('Get all entries')
        .notes('TODO');

      this.controller.post(collectionPath, function (req, res) {
        var data = {};
        data[nameOfRootElement] = _.map(req.params(nameOfRootElement), function (model) {
          return repository.save(model).forClient();
        });
        res.status(201);
        res.json(data);
      }).bodyParam(nameOfRootElement, 'TODO', [BodyParam])
        .summary('Post new entries')
        .notes('TODO');

      this.controller.get(entryPath, function (req, res) {
        var id = req.params('id'),
          entry = repository.byIdWithNeighbors(id),
          data = {};

        data[nameOfRootElement] = [entry.forClient()];

        res.json(data);
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).summary('Get a specific entry')
        .notes('TODO');

      // This works a little different from the standard:
      // It expects a root element, the standard does not
      this.controller.patch(entryPath, function (req, res) {
        var operations = req.params('operations'),
          id = req.params('id'),
          data = {};

        if (_.all(operations, function (x) { return x.isValid(); })) {
          data[nameOfRootElement] = repository.updateByIdWithOperations(id, operations).forClient();
          res.json(data);
        } else {
          res.json({ error: 'Only replace is supported right now' });
          res.status(405);
        }
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).bodyParam('operations', 'The operations to be executed on the document', [ReplaceOperation])
        .summary('Update an entry')
        .notes('TODO');

      this.controller.del(entryPath, function (req, res) {
        var id = req.params('id');
        repository.removeById(id);
        res.status(204);
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(ArangoError, 404, 'An entry with this ID could not be found')
        .summary('Remove an entry')
        .notes('TODO');
    }
  });

  transitions.push({ name: 'element', Transition: ElementTransition });

  ContainerTransition = function (appContext, graph, controller, states) {
    this.appContext = appContext;
    this.graph = graph;
    this.controller = controller;
    this.states = states;
  };

  _.extend(ContainerTransition.prototype, {
    apply: function (from, to) {
      require('console').log('From: %s, To: %s', from, to);
    }
  });

  transitions.push({ name: 'container', Transition: ContainerTransition });

  exports.mediaType = {
    Model: JsonApiModel,
    Repository: JsonApiRepository,
    transitions: transitions
  };
}());
