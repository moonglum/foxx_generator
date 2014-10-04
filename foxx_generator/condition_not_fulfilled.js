/*jslint indent: 2, nomen: true, maxlen: 120 */
/*global require */

(function () {
  'use strict';
  var ConditionNotFulfilled;

  ConditionNotFulfilled = function (msg) {
    this.name = 'ConditionNotFulfilled';
    this.msg = msg;
  };

  ConditionNotFulfilled.prototype = Error.prototype;

  exports.ConditionNotFulfilled = ConditionNotFulfilled;
}());
