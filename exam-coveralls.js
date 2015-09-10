#!/usr/bin/env node

var fs = require('fs')
var spawn = require('child_process').spawn
var istanbul = __dirname + '/node_modules/istanbul/lib/cli.js'
var coveralls = __dirname + '/node_modules/coveralls/bin/coveralls.js'

var cover = spawn(istanbul, [
  'cover',
  __dirname + '/exam.js',
  '--report', 'lcovonly',
  '-x', '**/common/**',
  '-x', '**/node_modules/**',
  '--', '-R', 'counts'
])

cover.on('close', function () {
  var send = spawn(coveralls)
  var lcov = fs.readFileSync('coverage/lcov.info')
  send.stdin.end(lcov)
  send.on('exit', function () {
    process.exit()
  })
})
