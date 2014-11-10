(function () {
  'use strict';
  var _ = require('underscore'),
    State = require('./state').State,
    defaultsForStateOptions,
    StateFactory;

  defaultsForStateOptions = {
    parameterized: false,
    verb: 'post',
    maxFailures: 1,
    queue: 'defaultQueue'
  };

  StateFactory = function (graph, transitions, states, controller) {
    this.graph = graph;
    this.transitions = transitions;
    this.states = states;
    this.controller = controller;
  };

  _.extend(StateFactory.prototype, {
    create: function (name, opts) {
      var options = _.defaults(opts, defaultsForStateOptions),
        state = new State(name, this.graph, options.parameterized);

      state.addTransitions(options.transitions, this.transitions);
      state.configure(options, this.states);

      return state;
    },

    createStartState: function (name, options) {
      var state = new State(name, this.graph, false);

      state.addTransitions(options.transitions, this.transitions);
      state.setAsStart(this.controller);

      return state;
    }
  });

  exports.StateFactory = StateFactory;
}());
