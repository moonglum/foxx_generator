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

    to: 'one',
    // to: 'many',

    // action: function() {
    //   Find the person in its repository
    // },
  });

  generator.addState('todo', {
    type: 'entity',

    attributes: {
      // Title of the state
      title: { type: 'string', required: true },

      // User ID of the person this is assigned to
      asignee: { type: 'string' }
    },

    transitions: [
      { to: 'person', via: 'asignee' }
    ]
  });

  generator.addState('person', {
    type: 'entity',

    attributes: {
      name: { type: 'string', required: true }
    }
  });

  generator.addState('todos', {
    type: 'repository',

    transitions: [
      { to: 'todo', via: 'element' }
    ]
  });

  generator.addState('people', {
    type: 'repository',

    transitions: [
      { to: 'person', via: 'element' }
    ]
  });
}());
