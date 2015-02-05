#!/usr/bin/env node

var fork = require('child_process').fork;
var cli = './node_modules/exam/node_modules/istanbul/lib/cli.js';

fork(cli, [
  'cover',
  './node_modules/exam/exam.js',
  '--color',
  '-x', '**/common/**',
  '-x', '**/node_modules/**'
]);
