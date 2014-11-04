(function () {
  'use strict';
  var _ = require('underscore'),
    defaultsForStateOptions,
    StateFactory;

  defaultsForStateOptions = {
    parameterized: false,
    verb: 'post',
    maxFailures: 1,
    queue: 'defaultQueue'
  };

  StateFactory = function (graph, transitions, states, State, controller) {
    this.graph = graph;
    this.transitions = transitions;
    this.states = states;
    this.State = State;
    this.controller = controller;
  };

  _.extend(StateFactory.prototype, {
    create: function (name, opts) {
      var options = _.defaults(opts, defaultsForStateOptions),
        state = new this.State(name, this.graph, options.parameterized);

      state.addTransitions(options.transitions, this.transitions);
      state.configure(options, this.states);

      return state;
    },

    createStartState: function (name, options) {
      var state = new this.State(name, this.graph, false);

      state.addTransitions(options.transitions, this.transitions);
      state.setAsStart(this.controller);

      return state;
    }
  });

  exports.StateFactory = StateFactory;
}());
