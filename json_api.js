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

  generator.addState('todos/:id', {
    attributes: {
      title: { type: 'string', required: true }
    },

    transitions: [
      { to: 'people', via: 'assignedTo' }
    ]
  });

  generator.addState('people/:id', {
    attributes: {
      name: { type: 'string', required: true }
    }
  });

  generator.addTransition('assignedTo', {
    description: 'Get the person this object is assigned to',
    // parameters: {},

    // condition: function(environment) {
    //   return environment.currentUser === this.to.owner;
    // },

    // action: function() { this.to.destroy();
    // },

    method: 'GET'
  });

  generator.addRepository('todos', {
    transitions: [
      { to: 'todos/:id', via: 'contains' }
    ],

    collectionName: 'todos',
    per_page: 10
  });
}());
