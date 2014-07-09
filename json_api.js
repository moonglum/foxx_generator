/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator').Generator,
    generator;

  generator = new FoxxGenerator('example', {
    mediaType: 'application/vnd.api+json',
    applicationContext: applicationContext,
  });

  generator.defineTransition('asignee', {
    description: 'Get the person this object is assigned to',
    to: 'one',
  // }).inverseTranstion('assigned', {
    // description: 'Get all objects that are assigned to this person',
    // to: 'many'
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
    },

    transitions: [
      // { to: 'todo', via: 'assigned' }
    ]
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
