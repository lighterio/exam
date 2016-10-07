#!/usr/bin/env node
/*

Usage:
  exam-coveralls [EXAM_ARGS] [-- ISTANBUL_ARGS]

Description:
  Run exam tests using the istanbul cover command.

*/

var fs = require('fs')
var spawn = require('child_process').spawn
var coverallsCli = require.resolve('coveralls/bin/coveralls.js')

var cover = require('./exam-cover')

cover.on('close', function () {
  var send = spawn(coverallsCli)
  var lcov = fs.readFileSync('coverage/lcov.info')
  send.stdin.end(lcov)
  send.on('exit', function () {
    process.exit()
  })
})
