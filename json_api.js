/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator').Generator,
    generator;

  generator = new FoxxGenerator({
    mediaType: 'application/vnd.api+json',
    applicationContext: applicationContext,
  });

  generator.defineTransition('asignee', {
    description: 'Get the person this object is assigned to',

    // action: function() {
    //   Find the person in its repository
    // },

    method: 'GET'
  });

  generator.addState('todos/:id', {
    attributes: {
      // Title of the state
      title: { type: 'string', required: true },

      // User ID of the person this is assigned to
      asignee: { type: 'string' }
    },

    transitions: [
      { to: 'people', via: 'asignee' }
    ]
  });

  generator.addState('people/:id', {
    attributes: {
      name: { type: 'string', required: true }
    }
  });

  generator.addRepository('todos', {
    transitions: [
      { to: 'todos/:id', via: 'contains' }
    ],

    collectionName: 'todos',
    per_page: 10
  });
}());
