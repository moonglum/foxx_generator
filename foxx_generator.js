/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    TransitionContext,
    defaultsForStateOptions,
    defaultsForTransitionOptions,
    parseOptions,
    extractDocumentation,
    mediaTypes;

  mediaTypes = {
    'application/vnd.siren+json': require('./foxx_generator/siren').mediaType
  };

  TransitionContext = function (Transition, transitions, graph, controller) {
    this.Transition = Transition;
    this.transitions = transitions;
    this.graph = graph;
    this.controller = controller;
  };

  Generator = function (name, options) {
    this.applicationContext = options.applicationContext;
    this.graph = new Graph(name, options.applicationContext);
    this.mediaType = mediaTypes[options.mediaType];
    this.controller = new Foxx.Controller(options.applicationContext, options);
    this.states = {};
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

  parseOptions = function (opts) {
    var options;

    opts = opts || {};
    options = _.defaults(opts, defaultsForTransitionOptions);
    options.precondition = options.precondition || options.condition;

    return options;
  };

  extractDocumentation = function (applicationContext) {
    var summary = '', notes = '';

    if (applicationContext.comments.length > 0) {
      do {
        summary = applicationContext.comments.shift();
      } while (summary === '');
      notes = applicationContext.comments.join('\n');
    }

    applicationContext.clearComments();

    return {
      summary: summary,
      notes: notes
    };
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
        options = parseOptions(opts),
        context,
        documentation = extractDocumentation(this.applicationContext);

      Transition = this.mediaType.Transition.extend(_.extend(options, {
        summary: documentation.summary,
        notes: documentation.notes,
        collectionBaseName: options.as || name,
        relationName: name,
        cardinality: options.to
      }));

      context = new TransitionContext(Transition, this.transitions, this.graph, this.controller);

      this.transitions[name] = new Transition(this.graph, this.controller);
      return context;
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
