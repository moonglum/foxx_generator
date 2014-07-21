/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var generateTransition,
    extend = require('org/arangodb/extend').extend,
    _ = require('underscore');

  generateTransition = function (name, type) {
    var Transition = function (graph, controller) {
      this.graph = graph;
      this.controller = controller;
    };

    _.extend(Transition.prototype, {
      edgeCollectionName: function (from, to) { return name + '_' + from.name + '_' + to.name; },
      relationType: function () { return type; },
      relationName: function () { return name; },

      apply: function (from, to) {
        from.relationNames.push({
          relationName: this.relationName(),
          edgeCollectionName: this.graph.extendEdgeDefinitions(this, from, to),
          type: this.relationType()
        });
      }
    });

    Transition.extend = extend;

    _.extend(Transition, {
      reverse: function (newName, type) {
        var ReverseTransition = Transition.extend({
          edgeCollectionName: function (from, to) { return name + '_' + to.name + '_' + from.name; },
          relationName: function () { return newName; },
          relationType: function () { return type; }
        });

        return ReverseTransition;
      }
    });

    return Transition;
  };

  exports.generateTransition = generateTransition;
}());
