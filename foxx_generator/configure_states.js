(function () {
  'use strict';
  var _ = require('underscore'),
    Repository = require('./repository_with_graph').RepositoryWithGraph,
    Model = require('./model').Model,
    configureStates;

  var determineUrlTemplate = function (state) {
    // require('console').log('Superstate? %s', state.superstate);
    if (state.parameterized) {
      state.urlTemplate = '/' + state.name + '/:id';
    } else {
      state.urlTemplate = '/' + state.name;
    }
  };

  configureStates = function (states) {
    var entities = _.filter(states, function (state) { return state.type === 'entity'; }),
      repositories = _.filter(states, function (state) { return state.type === 'repository'; }),
      services = _.filter(states, function (state) { return state.type === 'service'; }),
      starts = _.filter(states, function (state) { return state.type === 'start'; });

    _.each(states, function (state) {
      if (state.superstate) {
        state.superstate = states[state.superstate];
      }
    });

    _.each(states, determineUrlTemplate);

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

  exports.configureStates = configureStates;
}());
