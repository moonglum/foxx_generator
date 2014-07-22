// Wrapper around the graph


(function () {
  'use strict';
  var graph_module = require('org/arangodb/general-graph'),
    ArangoError = require('internal').ArangoError,
    _ = require('underscore'),
    Graph;

  Graph = function (name, appContext) {
    this.appContext = appContext;

    try {
      this.graph = graph_module._graph(name);
    } catch (e) {
      if (e instanceof ArangoError) {
        this.graph = graph_module._create(name);
      } else {
        throw e;
      }
    }
  };

  _.extend(Graph.prototype, {
    extendEdgeDefinitions: function (rawEdgeCollectionName, from, to) {
      var vertexCollections = [ from.collectionName, to.collectionName ],
        edgeCollectionName = this.appContext.collectionName(rawEdgeCollectionName),
        edgeDefinition = graph_module._undirectedRelation(edgeCollectionName, vertexCollections);

      try {
        this.graph._extendEdgeDefinitions(edgeDefinition);
      } catch (e) {
        if (e instanceof ArangoError) {
          require('console').log('Edge Definition "%s" already added', edgeCollectionName);
        } else {
          throw e;
        }
      }

      return edgeCollectionName;
    },

    addVertexCollection: function (collectionName) {
      var prefixedCollectionName = this.appContext.collectionName(collectionName);

      try {
        this.graph._addVertexCollection(prefixedCollectionName, true);
      } catch (e) {
        if (e instanceof ArangoError) {
          require('console').log('collection "%s" already exists. Leaving it untouched.', prefixedCollectionName);
        } else {
          throw e;
        }
      }

      return this.graph[prefixedCollectionName];
    },

    neighbors: function (id, options) {
      return this.graph._neighbors(id, options);
    }
  });

  exports.Graph = Graph;
}());
