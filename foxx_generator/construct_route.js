(function () {
  'use strict';
  var Foxx = require('org/arangodb/foxx'),
    ConditionNotFulfilled = require('./condition_not_fulfilled').ConditionNotFulfilled,
    VertexNotFound = require('./vertex_not_found').VertexNotFound,
    constructBodyParams,
    joi = require('joi'),
    constructRoute;

  constructBodyParams = function (relation) {
    return Foxx.Model.extend({ schema: relation.parameters });
  };

  constructRoute = function (opts) {
    var route,
      controller = opts.controller,
      verb = opts.verb,
      url = opts.url,
      action = opts.action,
      relation = opts.relation;

    route = controller[verb](url, action)
      .errorResponse(VertexNotFound, 404, 'The vertex could not be found')
      .errorResponse(ConditionNotFulfilled, 403, 'The condition could not be fulfilled')
      .onlyIf(relation.condition)
      .summary(relation.summary)
      .notes(relation.notes);

    require('console').log('Constructing a route for "%s"', url);

    if (opts.path) {
      route.pathParam('id', joi.string().description('ID of the entity'));
    }

    if (opts.body) {
      route.bodyParam(opts.body.name, 'TODO', constructBodyParams(relation));
    }
  };

  exports.constructRoute = constructRoute;
}());

