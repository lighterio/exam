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
var cover = 'cover'
var checkCoverage = 'check-coverage'

var dash = '--'
var timeout = '--timeout'
var minute = '60000'
var print = '--print'
var detail = 'detail'
var statements = '--statements'
var branches = '--branches'
var functions = '--functions'
var lines = '--lines'
var sixty = '60'

describe('exam-cover', function () {
  // Remember spawn arguments.
  var args

  // Simulate a child process with an emitter-like "on" method.
  var proc = {
    on: function (event, fn) {
      fn(0)
      return proc
    }
  }

  beforeEach(function () {
    args = []
    mock(child, {
      spawn: function () {
        args.push(arguments)
        return proc
      }
    })
    mock(process, {
      exit: mock.count()
    })
    delete require.cache[cwd + '/exam-cover.js']
  })

  afterEach(function () {
    unmock(child)
    unmock(process)
  })

  it('works without args', function () {
    process.argv = [node, coverCli]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1][2], dash)
    is(args[0][1].length, 3)
  })

  it('works with exam args', function () {
    process.argv = [node, coverCli, timeout, minute]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1][2], dash)
    is(args[0][1][3], timeout)
    is(args[0][1][4], minute)
    is(args[0][1].length, 5)
  })

  it('works with istanbul args', function () {
    process.argv = [node, coverCli, dash, print, detail]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1][2], print)
    is(args[0][1][3], detail)
    is(args[0][1][4], dash)
    is(args[0][1].length, 5)
  })

  it('works with exam and istanbul args', function () {
    process.argv = [node, coverCli, timeout, minute, dash, print, detail]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1][2], print)
    is(args[0][1][3], detail)
    is(args[0][1][4], dash)
    is(args[0][1][5], timeout)
    is(args[0][1][6], minute)
    is(args[0][1].length, 7)
  })

  it('runs check-coverage if --statements is passed in', function () {
    process.argv = [node, coverCli, statements, sixty]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1].length, 3)
    is(args[1][0], istanbulCli)
    is(args[1][1][0], checkCoverage)
    is(args[1][1][1], statements)
    is(args[1][1][2], sixty)
    is(args[1][1].length, 3)
  })

  it('runs check-coverage if --branches is passed in', function () {
    process.argv = [node, coverCli, branches, sixty]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1].length, 3)
    is(args[1][0], istanbulCli)
    is(args[1][1][0], checkCoverage)
    is(args[1][1][1], branches)
    is(args[1][1][2], sixty)
    is(args[1][1].length, 3)
  })

  it('runs check-coverage if --functions is passed in', function () {
    process.argv = [node, coverCli, functions, sixty]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1].length, 3)
    is(args[1][0], istanbulCli)
    is(args[1][1][0], checkCoverage)
    is(args[1][1][1], functions)
    is(args[1][1][2], sixty)
    is(args[1][1].length, 3)
  })

  it('runs check-coverage if --lines is passed in', function () {
    process.argv = [node, coverCli, lines, sixty]
    require('../exam-cover')
    is(args[0][0], istanbulCli)
    is(args[0][1][0], cover)
    is(args[0][1][1], examCli)
    is(args[0][1].length, 3)
    is(args[1][0], istanbulCli)
    is(args[1][1][0], checkCoverage)
    is(args[1][1][1], lines)
    is(args[1][1][2], sixty)
    is(args[1][1].length, 3)
  })
})
