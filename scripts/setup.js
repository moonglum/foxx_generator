/*jslint indent: 2, nomen: true, maxlen: 100, white: true, plusplus: true, unparam: true */
/*global todos*/
/*global require, applicationContext*/

(function() {
  "use strict";
  var console = require("console"),
    db = require("org/arangodb").db,
    todos = applicationContext.collectionName("todos");

  if (db._collection(todos) === null) {
    db._create(todos);
  } else if (applicationContext.isProduction) {
    console.warn("collection '%s' already exists. Leaving it untouched.", todos);
  }
}());
