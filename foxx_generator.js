(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    _ = require('underscore'),
    Graph = require('./foxx_generator/graph').Graph,
    Generator,
    StateFactory = require('./foxx_generator/state_factory').StateFactory,
    TransitionFactory = require('./foxx_generator/transition_factory').TransitionFactory,
    Repository = require('./foxx_generator/repository_with_graph').RepositoryWithGraph,
    Model = require('./foxx_generator/model').Model,
    configure,
    mediaTypes;

  mediaTypes = {
    'application/vnd.siren+json': require('./foxx_generator/siren').mediaType
  };

  configure = function (states) {
    var entities = _.filter(states, function (state) { return state.type === 'entity'; }),
      repositories = _.filter(states, function (state) { return state.type === 'repository'; }),
      services = _.filter(states, function (state) { return state.type === 'service'; }),
      starts = _.filter(states, function (state) { return state.type === 'start'; });

    _.each(starts, function (start) { start.setAsStart(); });
    _.each(services, function (service) { service.addService(); });

    _.each(entities, function (entity) {
      var repositoryState = states[entity.options.containedIn];
      entity.repositoryState = repositoryState;
      entity.addModel(Model);
    });

    _.each(repositories, function (repository) {
      var entityState = states[repository.options.contains];
      repository.entityState = entityState;
      repository.model = entityState.model;
      repository.addRepository(Repository);
    });

    _.each(entities, function (entity) {
      var repositoryState = entity.repositoryState;
      entity.collectionName = repositoryState.collectionName;
      entity.collection = repositoryState.collection;
      entity.repository = repositoryState.repository;
    });
  };

  Generator = function (name, options) {
    var applicationContext = options.applicationContext,
      graph = new Graph(name, applicationContext),
      strategies = mediaTypes[options.mediaType].strategies;

    this.controller = new Foxx.Controller(applicationContext, options);

    this.states = {};
    this.transitions = [];

    this.stateFactory = new StateFactory(graph, this.transitions, this.states);
    this.transitionFactory = new TransitionFactory(applicationContext, graph, this.controller, strategies);
  };

  _.extend(Generator.prototype, {
    addStartState: function (opts) {
      var name = '',
        options = _.defaults({ type: 'start', controller: this.controller }, opts);

      this.states[name] = this.stateFactory.create(name, options);
    },

    addState: function (name, opts) {
      this.states[name] = this.stateFactory.create(name, opts);
    },

    defineTransition: function (name, opts) {
      this.transitions[name] = this.transitionFactory.create(name, opts);
    },

    generate: function () {
      configure(this.states);
      _.each(this.states, function (state) { state.addTransitions(this.transitions); }, this);
      _.each(this.states, function (state) { state.prepareTransitions(this.states); }, this);
      _.each(this.states, function (state) { state.applyTransitions(this.states); }, this);
    }
  });

  exports.Generator = Generator;
}());
