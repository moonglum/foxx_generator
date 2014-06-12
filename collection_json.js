/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator'),
    Todo;

  Todo = FoxxGenerator.State.generate({
    attributes: {
      title: { type: 'string', required: true }
    }
  });

  FoxxGenerator.Repository.generate({
    applicationContext: applicationContext,
    contains: Todo,
    name: 'todos',
    per_page: 10
  });
}());
