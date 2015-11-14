'use strict'
/* global describe it beforeEach afterEach */
var is = global.is || require('exam/lib/is')
var mock = global.mock || require('exam/lib/mock')
var unmock = mock.unmock

var cwd = process.cwd()
var child = require('child_process')

var node = 'node'
var examCli = cwd + '/exam.js'
var coverCli = cwd + '/exam-cover.js'
var istanbulCli = cwd + '/node_modules/istanbul/lib/cli.js'
var cmd = 'cover'
var dash = '--'
var timeout = '--timeout'
var minute = '60000'
var print = '--print'
var detail = 'detail'

describe('exam-cover', function () {
  beforeEach(function () {
    mock(child, {spawn: mock.args()})
    delete require.cache[cwd + '/exam-cover.js']
  })

  afterEach(function () {
    unmock()
  })

  it('works without args', function () {
    process.argv = [node, coverCli]
    require('../exam-cover')
    var args = child.spawn.value[0]
    is(args[0], istanbulCli)
    is(args[1][0], cmd)
    is(args[1][1], examCli)
    is(args[1][2], dash)
    is(args[1].length, 3)
  })

  it('works with exam args', function () {
    process.argv = [node, coverCli, timeout, minute]
    require('../exam-cover')
    var args = child.spawn.value[0]
    is(args[0], istanbulCli)
    is(args[1][0], cmd)
    is(args[1][1], examCli)
    is(args[1][2], dash)
    is(args[1][3], timeout)
    is(args[1][4], minute)
    is(args[1].length, 5)
  })

  it('works with istanbul args', function () {
    process.argv = [node, coverCli, dash, print, detail]
    require('../exam-cover')
    var args = child.spawn.value[0]
    is(args[0], istanbulCli)
    is(args[1][0], cmd)
    is(args[1][1], examCli)
    is(args[1][2], print)
    is(args[1][3], detail)
    is(args[1][4], dash)
    is(args[1].length, 5)
  })

  it('works with exam and istanbul args', function () {
    process.argv = [node, coverCli, timeout, minute, dash, print, detail]
    require('../exam-cover')
    var args = child.spawn.value[0]
    is(args[0], istanbulCli)
    is(args[1][0], cmd)
    is(args[1][1], examCli)
    is(args[1][2], print)
    is(args[1][3], detail)
    is(args[1][4], dash)
    is(args[1][5], timeout)
    is(args[1][6], minute)
    is(args[1].length, 7)
  })
})
