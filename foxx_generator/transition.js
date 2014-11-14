(function () {
  'use strict';
  var extend = require('org/arangodb/extend').extend,
    ConditionNotFulfilled = require('./condition_not_fulfilled').ConditionNotFulfilled,
    _ = require('underscore'),
    Transition;

  Transition = function (graph, controller) {
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(Transition.prototype, {
    edgeCollectionName: function (from, to) { return this.collectionBaseName + '_' + from.name + '_' + to.name; },

    addRoutesForOneRelation: function (controller, graph, relation, from, to) {
      var context = new this.Context(this.type, from.type, to.type, 'one-to-one');
      context.executeOneToOne(controller, graph, relation, from, to);
    },

    addRoutesForManyRelation: function (controller, graph, relation, from, to) {
      var context = new this.Context(this.type, from.type, to.type, 'one-to-many');
      context.executeOneToMany(controller, graph, relation, from, to);
    },

    apply: function (from, to) {
      var condition, conditionWrapper, relation;

      condition = this.condition;

      conditionWrapper = function (req) {
        if (!condition(req)) {
          throw new ConditionNotFulfilled('Condition was not fulfilled');
        }
      };

      relation = {
        name: this.relationName,
        edgeCollectionName: this.graph.extendEdgeDefinitions(this.edgeCollectionName(from, to), from, to),
        cardinality: this.cardinality,
        type: this.type,
        parameters: this.parameters,
        summary: this.summary,
        notes: this.notes,
        condition: conditionWrapper,
        precondition: this.precondition,
        to: to
      };

      from.relations.push(relation);

      if (relation.cardinality === 'many') {
        this.addRoutesForManyRelation(this.controller, this.graph, relation, from, to);
      } else if (relation.cardinality === 'one') {
        this.addRoutesForOneRelation(this.controller, this.graph, relation, from, to);
      }
    }
  });

  Transition.extend = extend;

  exports.Transition = Transition;
}());
