/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var graph_module = require('org/arangodb/general-graph'),
    ArangoError = require('internal').ArangoError,
    _ = require('underscore'),
    Graph,
    VertexNotFound,
    tryAndHandleArangoError,
    alreadyExists;

  VertexNotFound = function () {
    this.name = 'VertexNotFound';
    this.message = 'The vertex could not be found';
  };
  VertexNotFound.prototype = Error.prototype;

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
    },

    edges: function (id, options) {
      return this.graph._vertices(id).edges().restrict(options.edgeCollectionRestriction).toArray();
    },

    removeEdges: function (options) {
      var graph = this.graph,
        vertexId = options.vertexId,
        edgeCollectionName = options.edgeCollectionName,
        edges;

      edges = this.edges(vertexId, {
        edgeCollectionRestriction: [edgeCollectionName],
      });

      _.each(edges, function (edge) {
        graph[edgeCollectionName].remove(edge._id);
      });
    },

    checkIfVerticesExist: function (ids) {
      if (!_.every(ids, this.hasVertex, this)) {
        throw new VertexNotFound();
      }
    },

    hasVertex: function (id) {
      return this.graph._vertices(id).count() > 0;
    },

    createEdge: function (options) {
      var sourceId = options.sourceId,
        destinationId = options.destinationId,
        edgeCollectionName = options.edgeCollectionName,
        edgeCollection = this.graph[edgeCollectionName];

      edgeCollection.save(sourceId, destinationId, {});
    }
  });

  exports.Graph = Graph;
  exports.VertexNotFound = VertexNotFound;
}());
