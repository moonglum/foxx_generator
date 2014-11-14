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
    }
  });

  Strategy.extend = extend;

  exports.Strategy = Strategy;
}());
