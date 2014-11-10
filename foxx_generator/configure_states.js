(function () {
  'use strict';
  var _ = require('underscore'),
    Repository = require('./repository_with_graph').RepositoryWithGraph,
    Model = require('./model').Model,
    configureStates;

  configureStates = function (states) {
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

  exports.configureStates = configureStates;
}());
