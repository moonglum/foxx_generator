/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    _ = require("underscore"),
    generateRepositoryState,
    generateState,
    RepositoryWithOperations,
    ReplaceOperation,
    Generator,
    ArangoError = require('internal').ArangoError;

  RepositoryWithOperations = Foxx.Repository.extend({
    updateByIdWithOperations: function (id, operations) {
      var model = this.byId(id);
      _.each(operations, function (operation) {
        operation.execute(model);
      });
      return this.replace(model);
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


  generateRepositoryState = function (controller, appContext, options) {
    var state = options.state,
      nameOfRootElement = options.nameOfRootElement,
      collectionName = options.collectionName,
      repository = new RepositoryWithOperations(appContext.collection(collectionName), { model: state }),
      per_page = options.per_page || 10,
      attributes = state.attributes,
      BodyParam = Foxx.Model.extend({}, { attributes: attributes });

    controller.get('/', function (req, res) {
      var data = {},
        page = req.params('page') || 0,
        skip = page * per_page;

      data[nameOfRootElement] = _.map(repository.all({skip: skip, limit: per_page}), function (datum) {
        return datum.forClient();
      });
      res.json(data);
    }).queryParam('page', {
      description: 'Page of the results',
      type: 'int'
    }).summary('Get all entries')
      .notes('Some fancy documentation');

    controller.get('/:id', function (req, res) {
      var id = req.params('id'),
        entry = repository.byId(id),
        data = {};

      data[nameOfRootElement] = [entry.forClient()];

      res.json(data);
    }).pathParam('id', {
      description: 'ID of the document',
      type: 'string'
    }).summary('Get a specific entry')
      .notes('Some fancy documentation');

    // This works a little different from the standard:
    // It expects a root element, the standard does not
    controller.patch('/:id', function (req, res) {
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
      .notes('Some fancy documentation');

    controller.del('/:id', function (req, res) {
      var id = req.params('id');
      repository.removeById(id);
      res.status(204);
    }).pathParam('id', {
      description: 'ID of the document',
      type: 'string'
    }).errorResponse(ArangoError, 404, 'An entry with this ID could not be found')
      .summary('Remove an entry')
      .notes('Some fancy documentation');

    controller.post('/', function (req, res) {
      var data = {};
      data[nameOfRootElement] = _.map(req.params(nameOfRootElement), function (model) {
        return repository.save(model).forClient();
      });
      res.status(201);
      res.json(data);
    }).bodyParam(nameOfRootElement, 'TODO', [BodyParam])
      .summary('Post new entries')
      .notes('Some fancy documentation');
  };

  generateState = function (options) {
    var attributes = options.attributes;
    return Foxx.Model.extend({
      forClient: function () {
        return _.extend({ id: this.get('_key') }, this.whitelistedAttributes);
      }
    }, { attributes: attributes });
  };

  Generator = function (options) {
    this.appContext = options.applicationContext;
    this.controller = new Foxx.Controller(this.appContext, options);
    this.states = {};
    this.transitions = {};
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      this.states[name] = generateState(options);
    },

    addTransition: function (name, options) {
      this.transitions[name] = {
        relation: options.relation,
        method: options.method
      };
    },

    addRepository: function (name, options) {
      var containsRelation = _.find(options.transitions, function (transition) {
        return transition.via === 'Contains';
      });
      options.state = this.states[containsRelation.to];
      options.nameOfRootElement = name;
      this.states[name] = generateRepositoryState(this.controller, this.appContext, options);
    }
  });

  exports.Generator = Generator;
}());
