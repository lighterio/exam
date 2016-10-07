#!/usr/bin/env node
/*

Usage:
  exam-cover [EXAM_ARGS] [-- ISTANBUL_ARGS]

Description:
  Run exam tests using the istanbul cover command.

  In addition to exam options, exam-cover supports arguments for
  checking coverage after the test suite has been instrumented
  and executed:

  --statements <minimum>  Requires at least <minimum> statement coverage
  --branches <minimum>    Requires at least <minimum> branch coverage
  --functions <minimum>   Requires at least <minimum> function coverage
  --lines <minimum>       Requires at least <minimum> line coverage

*/
var spawn = require('child_process').spawn
var examCli = require.resolve('exam/exam.js')
var istanbulCli = require.resolve('istanbul/lib/cli.js')

var args = process.argv
var dashes = args.indexOf('--') + 1
args.splice(0, 2, 'cover', examCli, '--')

if (dashes) {
  args.splice(dashes, 1)
  var istanbulArgs = args.splice(dashes, args.length - dashes)
  istanbulArgs.splice(0, 0, 2, 0)
  args.splice.apply(args, istanbulArgs)
}

var coverArgs = []
var checkCoverageArgs = ['check-coverage']

// Iterate over the arguments, removing minimum coverage requirement options
// and saving them for the check-coverage command.
for (var i = 0, l = args.length; i < l; i++) {
  var arg = args[i]
  switch (arg) {
    case '--statements':
    case '--branches':
    case '--functions':
    case '--lines':
      checkCoverageArgs.push(arg, args[++i] || 0)
      break
    default:
      coverArgs.push(arg)
      break
  }
}

var cover = module.exports = spawn(istanbulCli, coverArgs, {
  stdio: 'inherit'
})

cover.on('exit', function (coverCode) {
  if (checkCoverageArgs.length < 2) {
    return process.exit(coverCode)
  }
  var check = spawn(istanbulCli, checkCoverageArgs, {
    stdio: 'inherit'
  })
  check.on('exit', function (checkCode) {
    process.exit(checkCode || coverCode)
  })
})
