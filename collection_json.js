/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator'),
    Todo,
    Person,
    AssignedTo;

  Todo = FoxxGenerator.State.generate({
    attributes: {
      title: { type: 'string', required: true }
    },

    transitions: [
      { to: Person, via: AssignedTo }
    ]
  });

  Person = FoxxGenerator.State.generate({
    attributes: {
      name: { type: 'string', required: true }
    }
  });

  AssignedTo = FoxxGenerator.Transition.generate({
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

  FoxxGenerator.Repository.generate({
    applicationContext: applicationContext,
    contains: Todo,
    name: 'todos',
    per_page: 10
  });
}());
