/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';

  var State,
    _ = require('underscore');

  State = function (name, graph) {
    this.name = name;
    this.graph = graph;
    this.relationNames = [];
  };

  _.extend(State.prototype, {
    addTransitions: function (transitions, definitions) {
      this.transitions = _.map(transitions, function (transitionDescription) {
        return {
          type: transitionDescription.via,
          transition: definitions[transitionDescription.via],
          to: transitionDescription.to
        };
      });
    },

    findTransition: function (type) {
      return _.find(this.transitions, function (transition) {
        return transition.type === type;
      });
    },

    applyTransitions: function (states) {
      _.each(this.transitions, function (transitionDescription) {
        var to = states[transitionDescription.to];
        transitionDescription.transition.apply(this, to);
      }, this);
    },

    addRepository: function (Repository, Model) {
      this.collection = this.graph.addVertexCollection(this.name);
      this.collectionName = this.collection.name();

      this.repository = new Repository(this.collection, {
        model: Model,
        graph: this.graph
      });
    },

    addModel: function (Model, attributes) {
      this.model = Model.extend({}, {
        attributes: _.extend(attributes, { links: { type: 'object' }})
      });
    }
  });

  exports.State = State;
}());
