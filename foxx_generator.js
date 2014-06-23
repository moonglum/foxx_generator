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

    // TODO: Paginate by options.per_page
    // TODO: Add this to the default repository when it features pagination
    MyRepository = Foxx.Repository.extend({
      // Display all elements in the collection
      all: function (options) {
        return _.map(this.collection.toArray(), function (rawTodo) {
          var todo = new this.modelPrototype(rawTodo);
          return todo;
        }, this);
      }
    });

  Repository.generate = function(options) {
    var controller = new Foxx.Controller(options.applicationContext),
      model = options.contains,
      name = options.name,
      repository = new MyRepository(controller.collection(name), { model: model }),
      per_page = options.per_page,
      BodyParam,
      attributes = model.attributes;

    BodyParam = Foxx.Model.extend({}, { attributes: attributes });

    controller.get('/', function (req, res) {
      var data = {};
      data[name] = _.map(repository.all({per_page: per_page}), function (datum) {
        return datum.forClient();
      });
      res.json(data);
    }).summary('Get all entries').notes('Some fancy documentation');

    controller.post('/', function(req, res) {
      var data = {};
      data[name] = _.map(req.params(name), function(model) {
        return repository.save(model).forClient();
      });
      res.status(201);
      res.json(data);
    }).bodyParam(name, 'TODO', [BodyParam]).summary('Post new entries').notes('Some fancy documentation');
  };

  State.generate = function(options) {
    var attributes = options.attributes;
    return Foxx.Model.extend({}, { attributes: attributes });
  };

  exports.Repository = Repository;
  exports.State = State;
}());
