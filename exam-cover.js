#!/usr/bin/env node

var fork = require('child_process').fork
var cli = __dirname + '/node_modules/istanbul/lib/cli.js'

fork(cli, [
  'cover',
  __dirname + '/exam.js',
  '--color',
  '-x', '**/common/**',
  '-x', '**/node_modules/**'
])
