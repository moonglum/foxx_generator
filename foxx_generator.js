/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    db = require("org/arangodb").db,
    _ = require("underscore"),
    Repository = {},
    MyRepository,
    State = {};

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
      model = options.contains,
      repository = new MyRepository(controller.collection('todos'), { model: model }),
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

  State.generate = function(options) {
    var attributes,
      GeneratedModel;

    attributes = _.reduce(options.attributes, function (result, info, attribute_name) {
      result[attribute_name] = info.type;
      return result;
    }, {});

    GeneratedModel = Foxx.Model.extend({}, { attributes: attributes });

    return GeneratedModel;
  };

  exports.Repository = Repository;
  exports.State = State;
}());
