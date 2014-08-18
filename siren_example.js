/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext, Joi */

(function () {
  "use strict";
  var FoxxGenerator = require('./foxx_generator').Generator,
    Joi = require('joi'),
    generator;

  generator = new FoxxGenerator('example', {
    mediaType: 'application/vnd.siren+json',
    applicationContext: applicationContext,
  });

  // This should result in a link
  generator.defineTransition('listIdeas', {
    description: 'Get the list of all ideas',
    to: 'one'
  });

  // This should result in an action
  generator.defineTransition('addIdea', {
    semantics: 'link',
    to: 'one',
    description: 'Add an idea',

    parameters: {
      title: Joi.string()
      // .required();
      // .default('hello').description('roflcopter')
    }
  });

  generator.addStartState({
    transitions: [
      { to: 'ideas', via: 'listIdeas' }
    ]
  });

  generator.addState('idea', {
    type: 'entity',
    parameterized: true,

    attributes: {
      description: { type: 'string', required: true }
    },

    transitions: [
    ]
  });

  generator.addState('ideas', {
    type: 'repository',

    transitions: [
      { to: 'idea', via: 'addIdea' }
    ]
  });

  generator.generate();
}());
