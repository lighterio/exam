#!/usr/bin/env node

var fs = require('fs');
var isLocal = fs.exists('./node_modules/exam/exam.js');
var root = isLocal ? './node_modules/exam/' : './';

var fork = require('child_process').fork;
var cli = root + 'node_modules/istanbul/lib/cli.js';

fork(cli, [
  'cover',
  root + 'exam.js',
  '--color',
  '-x', '**/common/**',
  '-x', '**/node_modules/**'
]);
