/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    defaultsForStateOptions,
    defaultsForTransitionOptions,
    parseOptions,
    Documentation = require('./foxx_generator/documentation').Documentation,
    BaseTransition = require('./foxx_generator/base_transition').BaseTransition,
    BaseContext = require('./foxx_generator/context').Context,
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
  };

  defaultsForStateOptions = {
    parameterized: false,
    verb: 'post',
    maxFailures: 1,
    queue: 'defaultQueue'
  };

  defaultsForTransitionOptions = {
    type: 'follow',
    to: 'one',
    condition: function () { return true; }
  };

  parseOptions = function (name, opts, applicationContext) {
    var options,
      documentation = new Documentation(applicationContext);

    opts = opts || {};
    options = _.defaults(opts, defaultsForTransitionOptions);
    options.precondition = options.precondition || options.condition;

    return _.extend(options, {
      collectionBaseName: options.as || name,
      relationName: name,
      cardinality: options.to,
      summary: documentation.summary,
      notes: documentation.notes
    });
  };

  _.extend(Generator.prototype, {
    addStartState: function (options) {
      var name = '',
        state = new this.mediaType.State(name, this.graph, false);
      state.addTransitions(options.transitions, this.transitions);
      state.setAsStart(this.controller);
      this.states[name] = state;
    },

    addState: function (name, opts) {
      var options = _.defaults(opts, defaultsForStateOptions),
        state = new this.mediaType.State(name, this.graph, options.parameterized);

      state.addTransitions(options.transitions, this.transitions);
      state.configure(options, this.mediaType, this.states);

      this.states[name] = state;
    },

    defineTransition: function (name, opts) {
      var Transition,
        options = parseOptions(name, opts, this.applicationContext);

      Transition = this.Transition.extend(options);

      this.transitions[name] = new Transition(this.graph, this.controller);
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
