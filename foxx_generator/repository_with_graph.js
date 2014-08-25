/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    RepositoryWithGraph;

  RepositoryWithGraph = Foxx.Repository.extend({
    allWithNeighbors: function (options) {
      var results = this.all(options);
      _.each(results, function (result) {
        this.addLinks(result);
      }, this);
      return results;
    },

    byIdWithNeighbors: function (key) {
      var result = this.byId(key);
      this.addLinks(result);
      return result;
    },

    removeByKey: function (key) {
      this.collection.remove(key);
    },

    addLinks: function (model) {
      var links = {},
        graph = this.graph,
        relations = this.relations;

      _.each(relations, function (relation) {
        var neighbors = graph.neighbors(model.get('_id'), {
          edgeCollectionRestriction: [relation.edgeCollectionName]
        });

        if (relation.type === 'one' && neighbors.length > 0) {
          links[relation.name] = neighbors[0]._key;
        } else if (relation.type === 'many') {
          links[relation.name] = _.pluck(neighbors, '_key');
        }
      });

      model.set('links', links);
    }
  });

  exports.RepositoryWithGraph = RepositoryWithGraph;
}());