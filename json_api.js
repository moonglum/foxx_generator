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

  generator.addState('Todo', {
    attributes: {
      title: { type: 'string', required: true }
    },

    transitions: [
      { to: 'Person', via: 'AssignedTo' }
    ]
  });

  generator.addState('Person', {
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
    contains: 'Todo',
    name: 'todos',
    per_page: 10
  });
}());
