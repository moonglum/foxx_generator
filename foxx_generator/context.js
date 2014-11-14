(function () {
  'use strict';
  var Context,
    _ = require('underscore'),
    extend = require('org/arangodb/extend').extend;

  /*jshint maxlen: 200 */
  Context = function (type, from, to) {
    this.strategy = _.find(this.strategies, function (maybeStrategy) {
      return maybeStrategy.executable(type, from, to);
    });

    if (_.isUndefined(this.strategy)) {
      require('console').log('Couldn\'t find a strategy for semantic %s from %s to %s', type, from, to);
      throw 'Could not find strategy';
    }
  };
  /*jshint maxlen: 100 */

  _.extend(Context.prototype, {
    executeOneToOne: function (controller, graph, relation, from, to) {
      this.strategy.executeOneToOne(controller, graph, relation, from, to);
    },

    executeOneToMany: function (controller, graph, relation, from, to) {
      this.strategy.executeOneToMany(controller, graph, relation, from, to);
    }
  });

  Context.extend = extend;

  exports.Context = Context;
}());
