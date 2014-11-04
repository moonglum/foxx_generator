/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    StateFactory = require('./foxx_generator/state_factory').StateFactory,
    TransitionFactory = require('./foxx_generator/transition_factory').TransitionFactory,
    mediaTypes;

  mediaTypes = {
    'application/vnd.siren+json': require('./foxx_generator/siren').mediaType
  };

  Generator = function (name, options) {
    var applicationContext = options.applicationContext,
      graph = new Graph(name, applicationContext),
      mediaType = mediaTypes[options.mediaType],
      controller = new Foxx.Controller(applicationContext, options);

    this.states = {};

    this.transitions = _.reduce(mediaType.transitions, function (transitions, tuple) {
      transitions[tuple.name] = new tuple.Transition(graph, controller);
      return transitions;
    }, {}, this);

    this.stateFactory = new StateFactory(graph, this.transitions, this.states, mediaType.State, controller);
    this.transitionFactory = new TransitionFactory(applicationContext, graph, controller, mediaType.strategies);
  };

  _.extend(Generator.prototype, {
    addStartState: function (options) {
      var name = '';
      this.states[name] = this.stateFactory.createStartState(name, options);
    },

    addState: function (name, opts) {
      this.states[name] = this.stateFactory.create(name, opts);
    },

    defineTransition: function (name, opts) {
      this.transitions[name] = this.transitionFactory.create(name, opts);
    },

    generate: function () {
      _.each(this.states, function (state) { state.prepareTransitions(this.states); }, this);
      _.each(this.states, function (state) { state.applyTransitions(this.states); }, this);
    }
  });

  exports.Generator = Generator;
}());
