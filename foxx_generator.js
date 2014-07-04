/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    _ = require("underscore"),
    RepositoryWithOperations,
    ReplaceOperation,
    Generator,
    State,
    createCollection,
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

  State = function (name, appContext) {
    this.name = name;
    this.appContext = appContext;
  };

  _.extend(State.prototype, {
    addTransitions: function (transitions, definitions, states) {
      this.transitions = _.map(transitions, function (transitionDescription) {
        var result = {};
        result.type = transitionDescription.via;
        result.transition = definitions[transitionDescription.via];
        result.to = states[transitionDescription.to];
        return result;
      });
    },

    findTransition: function (type) {
      return _.find(this.transitions, function (transition) {
        return transition.type === type;
      });
    },

    addRepository: function (collectionName) {
      var collection = createCollection(this.appContext, collectionName),
        elementRelation = this.findTransition('element');

      this.repository = new RepositoryWithOperations(collection, {
        model: elementRelation.to.model
      });
    },

    addModel: function (attributes) {
      this.model = Foxx.Model.extend({
        forClient: function () {
          return _.extend({ id: this.get('_key') }, this.whitelistedAttributes);
        }
      }, {
        attributes: attributes,
      });
    },


    applyTransitions: function () {
      _.each(this.transitions, function (transitionDescription) {
        transitionDescription.transition.apply(this, transitionDescription.to);
      }, this);
    }
  });

  // This should later inherit from Transition
  ContainsTransition = function (appContext, controller, states) {
    this.appContext = appContext;
    this.controller = controller;
    this.states = states;
  };

  _.extend(ContainsTransition.prototype, {
    apply: function (from, to) {
      var entryPath = '/' + from.name + '/:id',
        collectionPath = '/' + from.name,
        perPage = 10,
        repository = from.repository,
        nameOfRootElement = from.name,
        Model = to.model,
        attributes = Model.attributes,
        BodyParam = Foxx.Model.extend({}, { attributes: attributes });

      this.controller.get(collectionPath, function (req, res) {
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

      this.controller.post(collectionPath, function (req, res) {
        var data = {};
        data[nameOfRootElement] = _.map(req.params(nameOfRootElement), function (model) {
          return repository.save(model).forClient();
        });
        res.status(201);
        res.json(data);
      }).bodyParam(nameOfRootElement, 'TODO', [BodyParam])
        .summary('Post new entries')
        .notes('Some fancy documentation');

      this.controller.get(entryPath, function (req, res) {
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
        .notes('Some fancy documentation');

      this.controller.del(entryPath, function (req, res) {
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
      element: new ContainsTransition(this.appContext, this.controller, this.states)
    };
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      var state = new State(name, this.appContext);

      state.addTransitions(options.transitions, this.transitions, this.states);

      switch (options.type) {
        case 'entity':
          state.addModel(options.attributes);
          break;
        case 'repository':
          state.addRepository(name);
          break;
        default:
          require('console').log('Unknown state type "' + options.type + '"');
      }

      state.applyTransitions();
      this.states[name] = state;
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
