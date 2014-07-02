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

  generator.addState('todos', {
    attributes: {
      title: { type: 'string', required: true }
    },

    transitions: [
      { to: 'people', via: 'AssignedTo' }
    ]
  });

  generator.addState('people', {
    attributes: {
      name: { type: 'string', required: true }
    }
  });

  generator.addTransition('AssignedTo', {
    relation: 'assignedTo',
    description: 'Get the person this object is assigned to',
    // parameters: {},

    // condition: function(environment) {
    //   return environment.currentUser === this.to.owner;
    // },

    // action: function() { this.to.destroy();
    // },

    method: 'GET'
  });

  generator.addRepository('TodoRepository', {
    // This should probably be `transitions: [ { via: contains } ]
    contains: 'todos',

    name: 'todos',
    per_page: 10
  });
}());
