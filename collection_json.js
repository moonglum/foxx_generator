/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator'),
    repository;

  FoxxGenerator.Repository.generate({
    applicationContext: applicationContext,
    // TODO: contains
    collection: 'todos',
    per_page: 10
  });
}());
