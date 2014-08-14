/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    // ArangoError = require('internal').ArangoError,
    BaseTransition = require('./base_transition').BaseTransition,
    BaseState = require('./state').State,
    // VertexNotFound = require('./graph').VertexNotFound,
    Transition,
    State,
    Model,
    Repository;

  Repository = Foxx.Repository.extend({
  });

  Model = Foxx.Model.extend({
  });

  State = BaseState.extend({
    // addRepository: function (Repository, states) {
    //   var elementRelation = this.findTransition('element'),
    //     Model = states[elementRelation.to].model;

    //   this.collection = this.graph.addVertexCollection(this.name);
    //   this.collectionName = this.collection.name();

    //   this.repository = new Repository(this.collection, {
    //     model: Model,
    //     graph: this.graph
    //   });
    // }
  });

  Transition = BaseTransition.extend({
    // addRoutesForOneRelation: function (controller, graph, relation, from, to) {
    // },

    // addRoutesForManyRelation: function (controller, graph, relation, from, to) {
    // }
  });

  exports.mediaType = {
    Model: Model,
    Repository: Repository,
    Transition: Transition,
    State: State,
    transitions: []
  };
}());
