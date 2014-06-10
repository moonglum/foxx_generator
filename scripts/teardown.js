/*jslint indent: 2, nomen: true, maxlen: 100, white: true, plusplus: true, unparam: true */
/*global todos*/
/*global require, applicationContext*/

(function() {
  "use strict";

  var db = require("org/arangodb").db,
    todos = applicationContext.collectionName("todos"),
    collection = db._collection(todos);

  if (collection !== null) {
    collection.drop();
  }
}());
