(function () {
  'use strict';

  var stateTypes = ['entity', 'repository', 'service', 'start'],
    extend = require('org/arangodb/extend').extend,
    _ = require('underscore'),
    State;

  State = function (name, graph, options) {
    this.name = name;
    this.graph = graph;
    this.options = options;
    this.parameterized = this.options.paramaterized;
    this.type = this.options.type;

    if (!_.contains(stateTypes, this.type)) {
      require('console').log('Unknown state type "' + options.type + '"');
      throw 'Unknown State Type';
    }

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
    addTransitions: function (definitions) {
      this.transitions = _.map(this.options.transitions, function (transitionDescription) {
        return {
          transition: definitions[transitionDescription.via],
          to: transitionDescription.to
        };
      });
    },

    findTransitionByType: function (type) {
      return _.find(this.transitions, function (transition) {
        return transition.transition.type === type;
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

    properties: function () {
      return {};
    },

    setAsStart: function () {
      var that = this;

      this.options.controller.get('/', function (req, res) {
        res.json({
          properties: {},
          links: that.filteredLinks(req),
          actions: that.filteredActions(req)
        });
      }).summary('Billboard URL')
        .notes('This is the starting point for using the API');
    },

    addRepository: function (Repository) {
      this.collection = this.graph.addVertexCollection(this.name);
      this.collectionName = this.collection.name();

      this.repository = new Repository(this.collection, {
        model: this.model,
        graph: this.graph
      });
    },

    addModel: function (Model) {
      this.model = Model.extend({
        schema: _.extend(this.options.attributes, { links: { type: 'object' } })
      }, {
        state: this,
      });
    },

    addService: function () {
      this.action = this.options.action;
      this.verb = this.options.verb.toLowerCase();
    },

    urlFor: function (selector) {
      var url;

      if (this.parameterized) {
        url = this.urlTemplate.replace(':id', selector);
      } else {
        url = this.urlTemplate;
      }

      return url;
    },

    entities: function () {
      var entities = [];

      if (this.type === 'repository') {
        entities = _.map(this.repository.all(), function (entity) {
          var result = entity.forClient();

          _.each(this.childLinks, function (link) {
            result.links.push({
              rel: link.rel,
              href: link.target.urlFor(entity.get('_key')),
              title: link.title
            });
          });
          return result;
        }, this);
      }

      return entities;
    },

    filteredLinks: function (req) {
      return _.filter(this.links, function (link) {
        return link.precondition(req);
      });
    },

    filteredActions: function (req) {
      return _.filter(this.actions, function (action) {
        return action.precondition(req);
      });
    },

    addLink: function (rel, href, title, precondition) {
      this.links.push({
        precondition: precondition,
        rel: rel,
        href: href,
        title: title
      });
    },

    addLinkToEntities: function (rel, href, title, target) {
      this.childLinks.push({
        rel: rel,
        href: href,
        title: title,
        target: target
      });
    },

    addAction: function (name, method, href, title, fields, precondition) {
      this.actions.push({
        precondition: precondition,
        name: name,
        // class: ?,
        method: method,
        href: href,
        title: title,
        type: 'application/json',
        fields: fields
      });
    }
  });

  State.extend = extend;

  exports.State = State;
}());
