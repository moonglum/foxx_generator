/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';

  var State,
    extend = require('org/arangodb/extend').extend,
    _ = require('underscore'),
    report = require('./reporter').report;

  State = function (name, graph, paramaterized) {
    this.name = name;
    this.graph = graph;
    this.parameterized = paramaterized;

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
    configure: function (options, mediaType, states) {
      switch (options.type) {
        case 'entity':
          this.addModel(mediaType.Model, options.attributes);
          break;
        case 'repository':
          this.addRepository(mediaType.Repository, states);
          break;
        case 'service':
          this.addService(options.action, options.verb);
          break;
        default:
          require('console').log('Unknown state type "' + options.type + '"');
          throw 'Unknown State Type';
      }
    },

    addTransitions: function (transitions, definitions) {
      this.transitions = _.map(transitions, function (transitionDescription) {
        return {
          transition: definitions[transitionDescription.via],
          to: transitionDescription.to
        };
      });
    },

    findTransitionBySemantics: function (semantics) {
      return _.find(this.transitions, function (transition) {
        return transition.transition.semantics === semantics;
      });
    },

    prepareTransitions: function (states) {
      _.each(this.transitions, function (transitionDescription) {
        var to = states[transitionDescription.to];
        transitionDescription.transition.prepare(this, to);
      }, this);
    },

    applyTransitions: function (states) {
      _.each(this.transitions, function (transitionDescription) {
        var to = states[transitionDescription.to];
        transitionDescription.transition.apply(this, to);
      }, this);
    },

    setAsStart: function () {
      this.type = 'start';
      report('Not implemented');
    },

    addRepository: function () {
      this.type = 'repository';
      report('Not implemented');
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
