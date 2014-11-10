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

  StateFactory = function (graph, transitions, states) {
    this.graph = graph;
    this.transitions = transitions;
    this.states = states;
  };

  _.extend(StateFactory.prototype, {
    create: function (name, opts) {
      var options = _.defaults(opts, defaultsForStateOptions),
        state = new State(name, this.graph, options);

      state.addTransitions(this.transitions);
      state.configure(this.states);

      return state;
    }
  });

  exports.StateFactory = StateFactory;
}());
