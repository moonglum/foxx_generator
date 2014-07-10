/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    graph_module = require('org/arangodb/general-graph'),
    ArangoError = require('internal').ArangoError,
    Generator,
    State,
    generateTransition,
    mediaTypes,
    findOrCreateGraph;

  findOrCreateGraph = function (name) {
    var graph;

    try {
      graph = graph_module._graph(name);
    } catch (e) {
      if (e instanceof ArangoError) {
        graph = graph_module._create(name);
      } else {
        throw e;
      }
    }

    return graph;
  };

  mediaTypes = {
    'application/vnd.api+json': require('./foxx_generator/json_api').mediaType
  };

  generateTransition = function (name, type) {
    var Transition = function (appContext, graph, controller, states) {
      this.name = name;
      this.appContext = appContext;
      this.graph = graph;
      this.controller = controller;
      this.states = states;
    };

    _.extend(Transition.prototype, {
      apply: function (from, to) {
        var edgeCollectionName = this.appContext.collectionName(name + '_' + from.name + '_' + to.name),
          // TODO: This is cheating
          fromCollectionName = this.appContext.collectionName('people'),
          toCollectionName = this.appContext.collectionName('todos'),
          vertexCollections = [ fromCollectionName, toCollectionName ],
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

        // TODO: Add Routes for manipulating the edges of the resource here

        from.relationNames.push({ relationName: name, edgeCollectionName: edgeCollectionName, type: type });
      }
    });

    return Transition;
  };

  State = function (name, graph, appContext) {
    this.name = name;
    this.graph = graph;
    this.relationNames = [];
    this.appContext = appContext;
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

    // This is still bound to the implementation of JSON+API
    addRepository: function (Repository) {
      var elementRelation = this.findTransition('element');

      this.createCollection(this.name);
      this.collectionName = this.collection.name();

      this.repository = new Repository(this.collection, {
        model: elementRelation.to.model,
        graph: this.graph
      });
    },

    addModel: function (Model, attributes) {
      this.model = Model.extend({}, {
        attributes: _.extend(attributes, { links: { type: 'object' }})
      });
    },

    applyTransitions: function (states) {
      _.each(this.transitions, function (transitionDescription) {
        var to = states[transitionDescription.to];
        transitionDescription.transition.apply(this, to);
      }, this);
    },

    createCollection: function (collectionName) {
      var console = require('console'),
        prefixedCollectionName = this.appContext.collectionName(collectionName);

      try {
        this.graph._addVertexCollection(prefixedCollectionName, true);
      } catch (e) {
        if (e instanceof ArangoError) {
          console.log('collection "%s" already exists. Leaving it untouched.', prefixedCollectionName);
        } else {
          throw e;
        }
      }

      this.collection = this.graph[prefixedCollectionName];
    }
  });

  Generator = function (name, options) {
    this.graph = findOrCreateGraph(name);
    this.mediaType = mediaTypes[options.mediaType];
    this.appContext = options.applicationContext;
    this.controller = new Foxx.Controller(this.appContext, options);
    this.states = {};
    this.transitions = _.reduce(this.mediaType.transitions, function (transitions, tuple) {
      transitions[tuple.name] = new tuple.Transition(this.appContext, this.graph, this.controller, this.states);
      return transitions;
    }, {}, this);
  };

  _.extend(Generator.prototype, {
    addState: function (name, options) {
      var state = new State(name, this.graph, this.appContext);

      state.addTransitions(options.transitions, this.transitions);

      switch (options.type) {
      case 'entity':
        state.addModel(this.mediaType.Model, options.attributes);
        break;
      case 'repository':
        state.addRepository(this.mediaType.Repository);
        break;
      default:
        require('console').log('Unknown state type "' + options.type + '"');
      }

      this.states[name] = state;
    },

    defineTransition: function (name, options) {
      var Transition = generateTransition(name, options.to);
      this.transitions[name] = new Transition(this.appContext, this.graph, this.controller, this.states);
    },

    generate: function () {
      _.each(this.states, function(state) {
        state.applyTransitions(this.states);
      }, this);
    }
  });

  exports.Generator = Generator;
}());
