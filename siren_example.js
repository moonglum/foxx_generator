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
    semantics: 'follow',
    description: 'Get the list of all ideas',
    to: 'one'
  });

  generator.defineTransition('showDetail', {
    semantics: 'follow',
    description: 'Show details for a particular item',
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

  generator.defineTransition('addTwoNumbers', {
    semantics: 'link',
    to: 'one',
    description: 'Add numbers',

    parameters: {
      summands: Joi.array().includes(Joi.number())
    }
  });

  generator.defineTransition('calculateFibonacci', {
    semantics: 'link',
    to: 'one',
    description: 'Calculate Fibonacci',

    parameters: {
      calculateFor: Joi.number()
    }
  });

  generator.addStartState({
    transitions: [
      { to: 'ideas', via: 'listIdeas' },
      { to: 'addition', via: 'addTwoNumbers' },
      { to: 'fibonacci', via: 'calculateFibonacci' }
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
      { to: 'idea', via: 'addIdea' },
      { to: 'idea', via: 'showDetail' }
    ]
  });

  generator.addState('addition', {
    type: 'service',

    action: function (req, res) {
      var addition = req.params('addition'),
        summands = addition.get('summands'),
        _ = require('underscore'),
        sum = _.reduce(summands, function (memo, num) { return memo + num; }, 0);

      res.json({
        sum: sum
      });
    },

    // verb: 'put',

    transitions: []
  });

  generator.addState('fibonacci', {
    type: 'asyncService',

    action: function (data) {
      var calculateFor = data.calculateFor;

      require('console').log('calculateFor: %s', calculateFor);
      var a=0, b=1, i, temp;

      for (i = 0; i < calculateFor; i++) {
        temp = a + b;
        a = b;
        b = temp;
      }
    },

    success: function () {
      require('console').log('Calculated result');
    },

    failure: function () {
      require('console').log('Could not calculate');
    },

    // maxFailures: 4,

    queue: 'fibonaccis'
  });

  generator.generate();
}());
