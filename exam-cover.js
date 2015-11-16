#!/usr/bin/env node
/*

Usage:
  exam-cover [EXAM_ARGS] [-- ISTANBUL_ARGS]

Description:
  Run exam tests using the istanbul cover command.

*/
var spawn = require('child_process').spawn
var examCli = __dirname + '/exam.js'
var istanbulCli = __dirname + '/node_modules/istanbul/lib/cli.js'

var args = process.argv
var dash = args.indexOf('--') + 1
args.splice(0, 2, 'cover', examCli, '--')

if (dash) {
  args.splice(dash, 1)
  var istanbulArgs = args.splice(dash, args.length - dash)
  istanbulArgs.splice(0, 0, 2, 0)
  args.splice.apply(args, istanbulArgs)
}

module.exports = spawn(istanbulCli, args, {stdio: 'inherit'})
