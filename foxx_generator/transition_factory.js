(function () {
  'use strict';
  var  _ = require('underscore'),
    defaultsForTransitionOptions,
    parseOptions,
    Documentation = require('./documentation').Documentation;

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

  var TransitionFactory = function (applicationContext, graph, controller, Transition) {
    this.applicationContext = applicationContext;
    this.graph = graph;
    this.controller = controller;
    this.Transition = Transition;
  };

  _.extend(TransitionFactory.prototype, {
    create: function (name, opts) {
      var Transition,
        options = parseOptions(name, opts, this.applicationContext),
        transition;

      Transition = this.Transition.extend(options);

      transition = new Transition(this.graph, this.controller);

      return transition;
    }
  });

  exports.TransitionFactory = TransitionFactory;
}());
