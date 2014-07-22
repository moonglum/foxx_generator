/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var graph_module = require('org/arangodb/general-graph'),
    ArangoError = require('internal').ArangoError,
    _ = require('underscore'),
    Graph,
    tryAndHandleArangoError,
    alreadyExists;

  tryAndHandleArangoError = function (func, errHandler) {
    try {
      func();
    } catch (e) {
      if (e instanceof ArangoError) {
        errHandler();
      } else {
        throw e;
      }
    }
  };

  alreadyExists = function (type, name) {
    return function () {
      require('console').log('%s "%s" already added. Leaving it untouched.', type, name);
    };
  };

  Graph = function (name, appContext) {
    var that = this;
    this.appContext = appContext;

    tryAndHandleArangoError(function () {
      that.graph = graph_module._graph(name);
    }, function () {
      that.graph = graph_module._create(name);
    });
  };

  _.extend(Graph.prototype, {
    extendEdgeDefinitions: function (rawEdgeCollectionName, from, to) {
      var vertexCollections = [ from.collectionName, to.collectionName ],
        edgeCollectionName = this.appContext.collectionName(rawEdgeCollectionName),
        edgeDefinition = graph_module._undirectedRelation(edgeCollectionName, vertexCollections),
        graph = this.graph;

      tryAndHandleArangoError(function () {
        graph._extendEdgeDefinitions(edgeDefinition);
      }, alreadyExists('EdgeDefinition', edgeCollectionName));

      return edgeCollectionName;
    },

    addVertexCollection: function (collectionName) {
      var prefixedCollectionName = this.appContext.collectionName(collectionName),
        graph = this.graph;

      tryAndHandleArangoError(function () {
        graph._addVertexCollection(prefixedCollectionName, true);
      }, alreadyExists('Collection', prefixedCollectionName));

      return this.graph[prefixedCollectionName];
    },

    neighbors: function (id, options) {
      return this.graph._neighbors(id, options);
    }
  });

  exports.Graph = Graph;
}());
