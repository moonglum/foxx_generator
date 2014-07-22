/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var extend = require('org/arangodb/extend').extend,
    _ = require('underscore'),
    Transition;

  Transition = function (graph, controller) {
    this.graph = graph;
    this.controller = controller;
  };

  _.extend(Transition.prototype, {
    edgeCollectionName: function (from, to) { return this.collectionBaseName + '_' + from.name + '_' + to.name; },

    apply: function (from, to) {
      from.relationNames.push({
        relationName: this.relationName,
        edgeCollectionName: this.graph.extendEdgeDefinitions(this.edgeCollectionName(from, to), from, to),
        type: this.relationType,
        to: to
      });
    }
  });

  _.extend(Transition, {
    reverse: function (newName, type) {
      var ReverseTransition = this.extend({
        edgeCollectionName: function (from, to) { return this.collectionBaseName + '_' + to.name + '_' + from.name; },
        relationName: newName,
        relationType: type
      });

      return ReverseTransition;
    }
  });

  Transition.extend = extend;

  exports.BaseTransition = Transition;
}());
