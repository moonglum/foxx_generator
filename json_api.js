/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator').Generator,
    Todo,
    Person,
    AssignedTo,
    generator;

  // Add options on which generator to use here (JSON+API etc.)
  generator = new FoxxGenerator({
    applicationContext: applicationContext,
  });

  Todo = generator.addState({
    attributes: {
      title: { type: 'string', required: true }
    },

    transitions: [
      { to: Person, via: AssignedTo }
    ]
  });

  Person = generator.addState({
    attributes: {
      name: { type: 'string', required: true }
    }
  });

  AssignedTo = generator.addTransition({
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

  generator.addRepository({
    contains: Todo,
    name: 'todos',
    per_page: 10
  });
}());
