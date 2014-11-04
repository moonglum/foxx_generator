/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    BaseTransition = require('./foxx_generator/base_transition').BaseTransition,
    BaseContext = require('./foxx_generator/context').Context,
    StateFactory = require('./foxx_generator/state_factory').StateFactory,
    TransitionFactory = require('./foxx_generator/transition_factory').TransitionFactory,
    mediaTypes;

  mediaTypes = {
    'application/vnd.siren+json': require('./foxx_generator/siren').mediaType
  };

  Generator = function (name, options) {
    var Context;
    this.applicationContext = options.applicationContext;
    this.graph = new Graph(name, options.applicationContext);
    this.mediaType = mediaTypes[options.mediaType];
    this.controller = new Foxx.Controller(options.applicationContext, options);
    this.states = {};

    Context = BaseContext.extend({
      strategies: this.mediaType.strategies
    });

    this.Transition = BaseTransition.extend({
      Context: Context
    });

    this.transitions = _.reduce(this.mediaType.transitions, function (transitions, tuple) {
      transitions[tuple.name] = new tuple.Transition(this.graph, this.controller);
      return transitions;
    }, {}, this);

    this.stateFactory = new StateFactory(this.graph, this.transitions, this.states, this.mediaType.State, this.controller);
    this.transitionFactory = new TransitionFactory(this.applicationContext, this.graph, this.controller, this.Transition);
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
      _.each(this.states, function (state) {
        state.prepareTransitions(this.states);
      }, this);

      _.each(this.states, function (state) {
        state.applyTransitions(this.states);
      }, this);
    }
  });

  exports.Generator = Generator;
}());
