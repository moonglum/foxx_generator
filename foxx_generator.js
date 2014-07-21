/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    graph_module = require('org/arangodb/general-graph'),
    extend = require('org/arangodb/extend').extend,
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
      this.appContext = appContext;
      this.graph = graph;
      this.controller = controller;
      this.states = states;
    };

    _.extend(Transition.prototype, {
      type: function () {
        return type;
      },

      apply: function (from, to) {
        var edgeCollectionName = this.edgeCollectionName(from, to),
          fromCollectionName = from.collectionName,
          toCollectionName = to.collectionName,
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

        from.relationNames.push({ relationName: name, edgeCollectionName: edgeCollectionName, type: this.type() });
      },

      edgeCollectionName: function (from, to) {
        require('console').log('Normal Transition: %s_%s_%s', name, from.name, to.name);
        return this.appContext.collectionName(name + '_' + from.name + '_' + to.name);
      }
    });

    Transition.extend = extend;

    _.extend(Transition, {
      reverse: function (newName, type) {
        var ReverseTransition = Transition.extend({
          edgeCollectionName: function (from, to) {
            return this.appContext.collectionName(name + '_' + to.name + '_' + from.name);
          },

          type: function () {
            return type;
          }
        });

        return ReverseTransition;
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
    addRepository: function (Repository, Model) {
      this.createCollection(this.name);
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

  var TransitionContext = function (Transition, options) {
    this.Transition = Transition;
    this.transitions = options.transitions;
    this.appContext = options.appContext;
    this.graph = options.graph;
    this.controller = options.controller;
    this.states = options.states;
  };

  _.extend(TransitionContext.prototype, {
    inverseTransition: function (name, options) {
      var Transition = this.Transition,
        ReverseTransition = Transition.reverse(name, options.to);

      this.transitions[name] = new ReverseTransition(this.appContext, this.graph, this.controller, this.states);
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
        var elementRelation = state.findTransition('element'),
          Model = this.states[elementRelation.to].model;
        state.addRepository(this.mediaType.Repository, Model);
        break;
      default:
        require('console').log('Unknown state type "' + options.type + '"');
      }

      this.states[name] = state;
    },

    defineTransition: function (name, options) {
      var Transition = generateTransition(name, options.to),
        context = new TransitionContext(Transition, {
          transitions: this.transitions,
          appContext: this.appContext,
          graph: this.graph,
          controller: this.controller,
          states: this.states
        });
      this.transitions[name] = new Transition(this.appContext, this.graph, this.controller, this.states);
      return context;
    },

    generate: function () {
      _.each(this.states, function(state) {
        state.applyTransitions(this.states);
      }, this);
    }
  });

  exports.Generator = Generator;
}());
