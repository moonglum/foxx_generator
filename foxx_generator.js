/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    TransitionContext,
    mediaTypes;

  mediaTypes = {
    'application/vnd.api+json': require('./foxx_generator/json_api').mediaType,
    'application/vnd.siren+json': require('./foxx_generator/siren').mediaType
  };

  TransitionContext = function (Transition, transitions, graph, controller) {
    this.Transition = Transition;
    this.transitions = transitions;
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(TransitionContext.prototype, {
    inverseTransition: function (name, options) {
      var ReverseTransition = this.Transition.reverse(name, options.to);
      this.transitions[name] = new ReverseTransition(this.graph, this.controller);
    }
  });

  Generator = function (name, options) {
    this.graph = new Graph(name, options.applicationContext);
    this.mediaType = mediaTypes[options.mediaType];
    this.controller = new Foxx.Controller(options.applicationContext, options);
    this.states = {};
    this.transitions = _.reduce(this.mediaType.transitions, function (transitions, tuple) {
      transitions[tuple.name] = new tuple.Transition(this.graph, this.controller);
      return transitions;
    }, {}, this);
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      var parameterized = (options.parameterized === true),
        state = new this.mediaType.State(name, this.graph, parameterized);

      state.addTransitions(options.transitions, this.transitions);

      switch (options.type) {
      case 'entity':
        state.addModel(this.mediaType.Model, options.attributes);
        break;
      case 'repository':
        state.addRepository(this.mediaType.Repository, this.states);
        break;
      default:
        require('console').log('Unknown state type "' + options.type + '"');
      }

      this.states[name] = state;
    },

    defineTransition: function (name, options) {
      var Transition,
        transitionType = options.type || 'follow',
        context;

      Transition = this.mediaType.Transition.extend({
        collectionBaseName: name,
        relationType: options.to,
        relationName: name,
        type: transitionType
      });

      context = new TransitionContext(Transition, this.transitions, this.graph, this.controller);

      this.transitions[name] = new Transition(this.graph, this.controller);
      return context;
    },

    generate: function () {
      _.each(this.states, function (state) {
        state.applyTransitions(this.states);
      }, this);
    }
  });

  exports.Generator = Generator;
}());
