(function () {
  'use strict';
  var _ = require('underscore'),
    R = require('ramda'),
    Repository = require('./repository_with_graph').RepositoryWithGraph,
    Model = require('./model').Model,
    configureStates,
    typeIs,
    determineSuperstate,
    prepareStartState,
    prepareServiceState,
    determineUrlTemplate,
    prepareEntityState,
    prepareRepositoryState,
    copyInfoFromRepositoryState;

  typeIs = R.curry(function (type, state) {
    return state.type === type;
  });

  determineSuperstate = R.curry(function (states, state) {
    if (state.superstate) {
      state.superstate = states[state.superstate];
    }
  });

  prepareStartState = R.curry(R.func('setAsStart'));
  prepareServiceState = R.curry(R.func('addService'));

  determineUrlTemplate = function (state) {
    var prefix = '/';

    if (!state.urlTemplate) {
      // Skip if already determined

      if (state.superstate) {
        // First determine the entire chain
        determineUrlTemplate(state.superstate);
        prefix = state.superstate.urlTemplate + '/';
      }

      if (state.parameterized) {
        state.urlTemplate = prefix + state.name + '/:id';
      } else {
        state.urlTemplate = prefix + state.name;
      }
    }
  };

  prepareEntityState = R.curry(function (states, entity) {
    var repositoryState = states[entity.options.containedIn];
    entity.repositoryState = repositoryState;
    entity.addModel(Model);
  });

  prepareRepositoryState = R.curry(function (states, repository) {
    var entityState = states[repository.options.contains];
    repository.entityState = entityState;
    repository.model = entityState.model;
    repository.addRepository(Repository);
  });

  copyInfoFromRepositoryState = function (entity) {
    var repositoryState = entity.repositoryState;
    entity.collectionName = repositoryState.collectionName;
    entity.collection = repositoryState.collection;
    entity.repository = repositoryState.repository;
  };

  configureStates = function (states) {
    var entities = _.filter(states, typeIs('entity')),
      repositories = _.filter(states, typeIs('repository')),
      services = _.filter(states, typeIs('service')),
      starts = _.filter(states, typeIs('start'));

    _.each(states, determineSuperstate(states));
    _.each(states, determineUrlTemplate);

    _.each(states, function (state) {
      require('console').log('State %s: %s', state.name, state.urlTemplate);
    });

    _.each(starts, prepareStartState);
    _.each(services, prepareServiceState);
    _.each(entities, prepareEntityState(states));
    _.each(repositories, prepareRepositoryState(states));
    _.each(entities, copyInfoFromRepositoryState);
  };

  exports.configureStates = configureStates;
}());
