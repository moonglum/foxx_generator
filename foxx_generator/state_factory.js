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

  StateFactory = function (graph, transitions, states, State) {
    this.graph = graph;
    this.transitions = transitions;
    this.states = states;
    this.State = State;
  };

  _.extend(StateFactory.prototype, {
    create: function (name, opts) {
      var options = _.defaults(opts, defaultsForStateOptions),
        state = new this.State(name, this.graph, options.parameterized);

      state.addTransitions(options.transitions, this.transitions);
      state.configure(options, this.states);

      return state;
    }
  });

  exports.StateFactory = StateFactory;
}());
