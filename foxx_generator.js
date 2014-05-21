/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    db = require("org/arangodb").db,
    _ = require("underscore"),
    Repository = {},
    MyRepository;

    MyRepository = Foxx.Repository.extend({
      // Display all elements in the collection
      all: function (options) {
        // TODO: Paginate by options.per_page
        return _.map(this.collection.toArray(), function (rawTodo) {
          var todo = new this.modelPrototype(rawTodo);
          return todo;
        }, this);
      }
    });

  Repository.generate = function(options) {
    var controller = new Foxx.Controller(options.applicationContext),
      repository = new MyRepository(controller.collection('todos')),
      per_page = options.per_page;

    controller.get('/', function (req, res) {
      var data = _.map(repository.all({per_page: per_page}), function (datum) {
        return datum.forClient();
      });
      res.json({
        todos: data
      });
    });
  };

  exports.Repository = Repository;
}());
