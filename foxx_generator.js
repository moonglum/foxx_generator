/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require */

(function () {
  "use strict";
  var Foxx = require("org/arangodb/foxx"),
    _ = require("underscore"),
    Repository = {},
    State = {};

  Repository.generate = function (options) {
    var appContext = options.applicationContext,
      controller = new Foxx.Controller(appContext),
      model = options.contains,
      name = options.name,
      repository = new Foxx.Repository(appContext.collection(name), { model: model }),
      per_page = options.per_page || 10,
      BodyParam,
      attributes = model.attributes;

    BodyParam = Foxx.Model.extend({}, { attributes: attributes });

    controller.get('/', function (req, res) {
      var data = {},
        page = req.params('page') || 0,
        skip = page * per_page;

      data[name] = _.map(repository.all({skip: skip, limit: per_page}), function (datum) {
        return datum.forClient();
      });
      res.json(data);
    }).queryParam('page', {
      description: 'Page of the results',
      type: 'int'
    }).summary('Get all entries')
      .notes('Some fancy documentation');

    controller.get('/:id', function (req, res) {
      var id = req.params('id'),
        entry = repository.byId(id),
        data = {};

      data[name] = [entry.forClient()];

      res.json(data);
    }).pathParam('id', {
      description: 'ID of the document',
      type: 'string'
    }).summary('Get a specific entry')
      .notes('Some fancy documentation');

    controller.post('/', function (req, res) {
      var data = {};
      data[name] = _.map(req.params(name), function (model) {
        return repository.save(model).forClient();
      });
      res.status(201);
      res.json(data);
    }).bodyParam(name, 'TODO', [BodyParam])
      .summary('Post new entries')
      .notes('Some fancy documentation');
  };

  State.generate = function (options) {
    var attributes = options.attributes;
    return Foxx.Model.extend({
      forClient: function () {
        return _.extend({ id: this.get('_key') }, this.whitelistedAttributes);
      }
    }, { attributes: attributes });
  };

  exports.Repository = Repository;
  exports.State = State;
}());
