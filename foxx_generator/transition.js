(function () {
  'use strict';
  var extend = require('org/arangodb/extend').extend,
    ConditionNotFulfilled = require('./condition_not_fulfilled').ConditionNotFulfilled,
    _ = require('underscore'),
    wrapCondition,
    Transition;

  wrapCondition = function (condition) {
    return function (req) {
      if (!condition(req)) {
        throw new ConditionNotFulfilled('Condition was not fulfilled');
      }
    };
  };

  Transition = function (graph, controller) {
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(Transition.prototype, {
    edgeCollectionName: function (from, to) { return this.collectionBaseName + '_' + from.name + '_' + to.name; },

    relationBetween: function (from, to) {
      return {
        name: this.relationName,
        edgeCollectionName: this.graph.extendEdgeDefinitions(this.edgeCollectionName(from, to), from, to),
        cardinality: this.cardinality,
        type: this.type,
        parameters: this.parameters,
        summary: this.summary,
        notes: this.notes,
        condition: wrapCondition(this.condition),
        precondition: this.precondition,
        to: to
      };
    },

    apply: function (from, to) {
      var relation = this.relationBetween(from, to),
        context = new this.Context(this.type, from.type, to.type, 'one-to-' + relation.cardinality);

      from.relations.push(relation);

      context.execute(this.controller, this.graph, relation, from, to);
    }
  });

  Transition.extend = extend;

  exports.Transition = Transition;
}());
