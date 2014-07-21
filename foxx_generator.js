/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    TransitionContext,
    State = require('./foxx_generator/state').State,
    generateTransition = require('./foxx_generator/generate_transition').generateTransition,
    mediaTypes;

  mediaTypes = {
    'application/vnd.api+json': require('./foxx_generator/json_api').mediaType
  };

  TransitionContext = function (Transition, options) {
    this.Transition = Transition;
    this.transitions = options.transitions;
    this.graph = options.graph;
    this.controller = options.controller;
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
      var state = new State(name, this.graph);

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
      var Transition = generateTransition(name, options.to),
        context = new TransitionContext(Transition, {
          transitions: this.transitions,
          graph: this.graph,
          controller: this.controller
        });
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
