/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    _ = require("underscore"),
    generateRepositoryState,
    generateEntityState,
    RepositoryWithOperations,
    ReplaceOperation,
    Generator,
    createCollection,
    createRepository,
    ContainsTransition,
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

  createCollection = function (appContext, collectionName) {
    var console = require("console"),
      db = require("org/arangodb").db,
      prefixedCollectionName = appContext.collectionName(collectionName);

    if (db._collection(prefixedCollectionName) === null) {
      db._create(prefixedCollectionName);
    } else if (appContext.isProduction) {
      console.warn("collection '%s' already exists. Leaving it untouched.", prefixedCollectionName);
    }

    return db._collection(prefixedCollectionName);
  };

  createRepository = function (appContext, collectionName, state) {
    var repository,
      collection = createCollection(appContext, collectionName);

    repository = new RepositoryWithOperations(collection, {
      model: state
    });

    return repository;
  };

  generateRepositoryState = function (appContext, options) {
    var path = options.path,
      repository = createRepository(appContext, options.collectionName, options.state),
      perPage = options.perPage || 10;

    return {
      repository: repository,
      path: path,
      perPage: perPage
    };
  };

  generateEntityState = function (name, options) {
    var attributes = options.attributes;
    return Foxx.Model.extend({
      forClient: function () {
        return _.extend({ id: this.get('_key') }, this.whitelistedAttributes);
      }
    }, {
      attributes: attributes,
      path: '/' + name,
      nameOfRootElement: 'todos'
    });
  };

  // This should later inherit from Transition
  ContainsTransition = function (controller) {
    this.controller = controller;
  };

  _.extend(ContainsTransition.prototype, {
    apply: function (from, to) {
      var toPath = to.path,
        fromPath = from.path,
        perPage = from.perPage,
        repository = from.repository,
        nameOfRootElement = to.nameOfRootElement,
        attributes = to.attributes,
        BodyParam = Foxx.Model.extend({}, { attributes: attributes });

      this.controller.get(fromPath, function (req, res) {
        var data = {},
          page = req.params('page') || 0,
          skip = page * perPage;

        data[nameOfRootElement] = _.map(repository.all({skip: skip, limit: perPage}), function (datum) {
          return datum.forClient();
        });
        res.json(data);
      }).queryParam('page', {
        description: 'Page of the results',
        type: 'int'
      }).summary('Get all entries')
        .notes('Some fancy documentation');

      this.controller.post(fromPath, function (req, res) {
        var data = {};
        data[nameOfRootElement] = _.map(req.params(nameOfRootElement), function (model) {
          return repository.save(model).forClient();
        });
        res.status(201);
        res.json(data);
      }).bodyParam(nameOfRootElement, 'TODO', [BodyParam])
        .summary('Post new entries')
        .notes('Some fancy documentation');

      this.controller.get(toPath, function (req, res) {
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
      this.controller.patch(toPath, function (req, res) {
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

      this.controller.del(toPath, function (req, res) {
        var id = req.params('id');
        repository.removeById(id);
        res.status(204);
      }).pathParam('id', {
        description: 'ID of the document',
        type: 'string'
      }).errorResponse(ArangoError, 404, 'An entry with this ID could not be found')
        .summary('Remove an entry')
        .notes('Some fancy documentation');
    }
  });

  Generator = function (options) {
    this.appContext = options.applicationContext;
    this.controller = new Foxx.Controller(this.appContext, options);
    this.states = {};
    this.transitions = {
      contains: new ContainsTransition(this.controller)
    };
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      var newState, containsRelation;

      if (options.type === 'entity') {
        // Check if it has attributes and transitions
        newState = generateEntityState(name, options);
      } else if (options.type === 'repository') {
        // Check if it has collectionName, perPage, transitions and a `contains` transition
        containsRelation = _.find(options.transitions, function (transition) {
          return transition.via === 'contains';
        });
        options.state = this.states[containsRelation.to];
        options.path = '/' + name;
        options.nameOfRootElement = name;
        newState = generateRepositoryState(this.appContext, options);
      }

      this.states[name] = newState;

      _.each(options.transitions, function (transitionDescription) {
        var transition = this.transitions[transitionDescription.via],
          from = newState,
          to = this.states[transitionDescription.to];

        transition.apply(from, to);
      }, this);
    },

    // This has to be adapted
    defineTransition: function (name, options) {
      var transition = {
        apply: function () {
          require('console').log('"%s" (with "%s") has to be adapted', name, options);
        }
      };
      this.transitions[name] = transition;
    }
  });

  exports.Generator = Generator;
}());
