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

    addRoutesForManyRelation: function (controller, graph, relation) {
      // Overwrite me in media type specific transition
      require('console').log('No route for "to many" transition "%s" added (%s)', relation.name, controller && graph);
    },

    addRoutesForOneRelation: function (controller, graph, relation) {
      // Overwrite me in media type specific transition
      require('console').log('No route for "to one" transition "%s" added (%s)', relation.name, controller && graph);
    },

    apply: function (from, to) {
      from.relations.push({
        name: this.relationName,
        edgeCollectionName: this.graph.extendEdgeDefinitions(this.edgeCollectionName(from, to), from, to),
        type: this.relationType,
        parameters: this.parameters,
        description: this.description,
        to: to
      });

      _.each(from.relations, function (relation) {
        if (relation.type === 'many') {
          this.addRoutesForManyRelation(this.controller, this.graph, relation, from, to);
        } else if (relation.type === 'one') {
          this.addRoutesForOneRelation(this.controller, this.graph, relation, from, to);
        }
      }, this);
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
