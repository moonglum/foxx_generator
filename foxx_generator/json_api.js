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
    transitions = [],
    generateLinkTemplates;

  generateLinkTemplates = function (state, root) {
    return _.reduce(state.relations, function (result, relation) {
      var path = root + '.' + relation.name;
      result[path] = relation.to.urlFor('{' + path + '}');
      return result;
    }, {});
  };

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
      _.each(results, function (result) {
        this.addLinks(result);
      }, this);
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
        relations = this.relations;

      _.each(relations, function (relation) {
        var neighbors = graph.neighbors(model.get('_id'), {
          edgeCollectionRestriction: [relation.edgeCollectionName]
        });

        if (relation.type === 'one' && neighbors.length > 0) {
          links[relation.name] = neighbors[0]._key;
        } else if (relation.type === 'many') {
          links[relation.name] = _.pluck(neighbors, '_key');
        }
      });

      model.set('links', links);
    }
  });

  JsonApiModel = Foxx.Model.extend({
    forClient: function () {
      var attributes = Foxx.Model.prototype.forClient.call(this),
        state = this.constructor.state,
        id = this.get('_key');

      return _.extend({
        id: id,
        type: state.name,
        href: state.urlFor(id)
      }, attributes);
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

  ElementTransition = function (graph, controller) {
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(ElementTransition.prototype, {
    apply: function (from, to) {
      var perPage = 10,
        repository = from.repository,
        nameOfRootElement = from.name,
        Model = to.model,
        attributes = Model.attributes,
        BodyParam = Foxx.Model.extend({}, { attributes: attributes });

      from.urlTemplate = '/' + from.name;
      repository.relations = to.relations;

      this.controller.get(from.urlTemplate, function (req, res) {
        var data = {},
          page = req.params('page') || 0,
          skip = page * perPage,
          options = { skip: skip, limit: perPage };

        data[nameOfRootElement] = _.map(repository.allWithNeighbors(options), function (datum) {
          return datum.forClient();
        });
        data.links = generateLinkTemplates(to, nameOfRootElement);

        res.json(data);
      }).queryParam('page', {
        description: 'Page of the results',
        type: 'int'
      }).summary('Get all entries')
        .notes('TODO');

      this.controller.post(from.urlTemplate, function (req, res) {
        var data = {};
        data[nameOfRootElement] = _.map(req.params(nameOfRootElement), function (model) {
          return repository.save(model).forClient();
        });
        res.status(201);
        res.json(data);
      }).bodyParam(nameOfRootElement, 'TODO', [BodyParam])
        .summary('Post new entries')
        .notes('TODO');
    }
  });

  transitions.push({ name: 'element', Transition: ElementTransition });

  ContainerTransition = function (graph, controller) {
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(ContainerTransition.prototype, {
    apply: function (from, to) {
      var repository = to.repository,
        nameOfRootElement = to.name;

      from.urlTemplate = '/' + to.name + '/:id';
      from.collectionName = to.collectionName;

      this.controller.get(from.urlTemplate, function (req, res) {
        var id = req.params('id'),
          entry = repository.byIdWithNeighbors(id),
          data = {};

        data[nameOfRootElement] = entry.forClient();
        data.links = generateLinkTemplates(from, nameOfRootElement);

        res.json(data);
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).summary('Get a specific entry')
        .notes('TODO');

      // This works a little different from the standard:
      // It expects a root element, the standard does not
      this.controller.patch(from.urlTemplate, function (req, res) {
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

      this.controller.del(from.urlTemplate, function (req, res) {
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

  transitions.push({ name: 'container', Transition: ContainerTransition });

  exports.mediaType = {
    Model: JsonApiModel,
    Repository: JsonApiRepository,
    transitions: transitions
  };
}());
