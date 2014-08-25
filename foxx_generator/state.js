/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';

  var State,
    extend = require('org/arangodb/extend').extend,
    _ = require('underscore'),
    Foxx = require("org/arangodb/foxx");

  State = function (name, graph, paramaterized) {
    this.name = name;
    this.graph = graph;
    this.parameterized = paramaterized;

    // TODO: Do this in the child class
    this.links = [];
    this.actions = [];
    this.childLinks = [];

    if (this.parameterized) {
      this.urlTemplate = '/' + this.name + '/:id';
    } else {
      this.urlTemplate = '/' + this.name;
    }

    this.relations = [];
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

    findTransitionByType: function (type) {
      return _.find(this.transitions, function (transition) {
        return transition.type === type;
      });
    },

    findTransitionBySemantics: function (semantics) {
      return _.find(this.transitions, function (transition) {
        return transition.transition.semantics === semantics;
      });
    },

    applyTransitions: function (states) {
      _.each(this.transitions, function (transitionDescription) {
        var to = states[transitionDescription.to];
        transitionDescription.transition.apply(this, to);
      }, this);
    },

    setAsStart: function () {
      this.type = 'start';
      require('console').log('Not implemented');
    },

    addRepository: function () {
      this.type = 'repository';
      require('console').log('Not implemented');
    },

    addModel: function (Model, attributes) {
      this.type = 'entity';
      this.model = Model.extend({}, {
        state: this,
        attributes: _.extend(attributes, { links: { type: 'object' } })
      });
    },

    addService: function (action, verb) {
      this.type = 'service';
      this.action = action;
      this.verb = verb.toLowerCase();
    },

    addAsyncService: function (name, action, verb, success, failure, maxFailures, queueName) {
      this.type = 'asyncService';

      var queue = Foxx.queues.create(queueName);

      Foxx.queues.registerJobType(name, {
        execute: action,
        maxFailures: maxFailures
      });

      this.executeAsync = function (data) {
        queue.push(name, data, {
          success: success,
          failure: failure
        });
      };

      this.verb = verb.toLowerCase();
    },

    urlFor: function (selector) {
      var url;

      if (this.parameterized) {
        url = this.urlTemplate.replace(':id', selector);
      } else {
        url = this.urlTemplate;
      }

      return url;
    }
  });

  State.extend = extend;

  exports.State = State;
}());
