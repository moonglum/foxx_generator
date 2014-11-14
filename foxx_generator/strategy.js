(function () {
  'use strict';
  var Strategy,
    _ = require('underscore'),
    extend = require('org/arangodb/extend').extend,
    report = require('./reporter').report;

  Strategy = function () {
  };

  _.extend(Strategy.prototype, {
    executable: function (type, from, to, cardinality) {
      return type === this.type && from === this.from && to === this.to && cardinality === this.cardinality;
    },

    /*jshint maxlen: 200 */
    executeOneToOne: function () {
      report('Nothing to execute for one to one with type %s from %s to %s (%s)', this.type, this.from, this.to, this.cardinality);
    },

    executeOneToMany: function () {
      report('Nothing to execute for one to many with type %s from %s to %s (%s)', this.type, this.from, this.to, this.cardinality);
    },
    /*jshint maxlen: 100 */
  });

  Strategy.extend = extend;

  exports.Strategy = Strategy;
}());
