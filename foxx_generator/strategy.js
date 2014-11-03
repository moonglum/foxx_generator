(function () {
  'use strict';
  var Strategy,
    _ = require('underscore'),
    extend = require('org/arangodb/extend').extend,
    report = require('./reporter').report;

  Strategy = function () {
  };

  _.extend(Strategy.prototype, {
    executable: function (type, from, to) {
      return type === this.type && from === this.from && to === this.to;
    },

    prepare: function () {
      report('Nothing to prepare with type %s from %s to %s', this.type, this.from, this.to);
    },

    /*jshint maxlen: 200 */
    executeOneToOne: function () {
      report('Nothing to execute for one to one with type %s from %s to %s', this.type, this.from, this.to);
    },

    executeOneToMany: function () {
      report('Nothing to execute for one to many with type %s from %s to %s', this.type, this.from, this.to);
    },
    /*jshint maxlen: 100 */
  });

  Strategy.extend = extend;

  exports.Strategy = Strategy;
}());
