/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Generator,
    State,
    mediaTypes;

  mediaTypes = {
    'application/vnd.api+json': require('./foxx_generator/json_api').mediaType
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

    // This is still bound to the implementation of JSON+API
    addRepository: function (Repository, collectionName) {
      var elementRelation = this.findTransition('element');

      this.createCollection(collectionName);

      this.repository = new Repository(this.collection, {
        model: elementRelation.to.model
      });
    },

    addModel: function (Model, attributes) {
      this.model = Model.extend({}, {
        attributes: attributes,
      });
    },

    applyTransitions: function () {
      _.each(this.transitions, function (transitionDescription) {
        transitionDescription.transition.apply(this, transitionDescription.to);
      }, this);
    },

    createCollection: function (collectionName) {
      var console = require('console'),
        db = require('org/arangodb').db,
        prefixedCollectionName = this.appContext.collectionName(collectionName);

      if (db._collection(prefixedCollectionName) === null) {
        db._create(prefixedCollectionName);
      } else if (this.appContext.isProduction) {
        console.warn('collection "%s" already exists. Leaving it untouched.', prefixedCollectionName);
      }

      this.collection = db._collection(prefixedCollectionName);
    }
  });

  Generator = function (options) {
    this.mediaType = mediaTypes[options.mediaType];
    this.appContext = options.applicationContext;
    this.controller = new Foxx.Controller(this.appContext, options);
    this.states = {};
    this.transitions = _.reduce(this.mediaType.transitions, function (transitions, tuple) {
      transitions[tuple.name] = new tuple.Transition(this.appContext, this.controller, this.states);
      return transitions;
    }, {}, this);
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      var state = new State(name, this.appContext);

      state.addTransitions(options.transitions, this.transitions, this.states);

      switch (options.type) {
      case 'entity':
        state.addModel(this.mediaType.Model, options.attributes);
        break;
      case 'repository':
        state.addRepository(this.mediaType.Repository, name);
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
