var Emitter = require('../common/event/emitter')
var runBenchmark = require('./bench')
require('../common/json/write-stream')

/**
 * Run a `tree` of assigned test files.
 * In single process mode, files are passed via `options` from `lib/exam.js`.
 * In multi-process mode, files are specified via the `--files` argument.
 */
var tree = module.exports = function (options) {

  options = options || require('./options')()
  var grep = options.grep
  var ignore = options.ignore
  var reporter = require('./reporters/' + options.reporter)
  var stream = reporter.stream = options.stream || process.stdout
  var showProgress = reporter.init && !options.hideProgress
  var scope = {}

  if (showProgress) {
    reporter.init(options)
  }

  if (options.multiProcess) {
    JSON.writeStream(stream)
  }

  if (options.require) {
    options.require.forEach(function (module) {
      require(module)
    })
  }

  /**
   * Reference timing essentials prior to tests in case of time mocking.
   */
  var timers = require('timers')
  var setTimeout = timers.setTimeout
  var clearTimeout = timers.clearTimeout
  var Date = global.Date

  /**
   * Expose Exam's built-in assertions and mocks.
   */
  scope.is = require('./is')
  scope.mock = require('./mock')
  scope.unmock = scope.mock.unmock

  /**
   * Track the phases suites and tests with constants.
   */
  var WAIT = 0
  var BEFORE = 1
  var RUN = 2
  var CHILDREN = 3
  var AFTER = 4
  var END = 5

  /**
   * Store test prep functions in an array.
   */
  var prepKeys = ['beforeEach', 'afterEach']
  var prep = [null, null]

  var asyncPattern = /^function.*?\([^\s\)]/

  /**
   * Use an EcmaScript parser to preempt SyntaxError logging.
   */
  var isInstrumented = process.env.running_under_istanbul; // jshint ignore:line
  if (options.parser && !isInstrumented) {

    var parser = require(options.parser)
    var parserExp = /(^[\s|\S]+?[\/\\](esprima|acorn)\.js:\d+:\d+\))[\s\S]*$/
    var Module = require('module')
    var resolve = Module._resolveFilename
    var parsingPath = ''

    // Capture the path of each module we require.
    Module._resolveFilename = function () {
      var path = resolve.apply(Module, arguments)
      // If we're not in a native module or a sub module, parse the path.
      if (path[0] === '/' && path.indexOf('/node_modules/') < 0) {
        parsingPath = path
      }
      return path
    }

    // TODO: Test this method of module wrapping in older Node versions.
    Module.wrap = function (script) {
      if (parsingPath) {
        var wrapped = 'var f=function(){' + script + '}'
        try {
          // The speed of `eval` is ~3x Acorn and ~5x Esprima.
          eval(wrapped); // jshint ignore:line
        } catch (e) {
          // If eval failed, use Acorn or Esprima to find the line and column.
          parser.parse(wrapped)
        }
        parsingPath = ''
      }
      script = Module.wrapper[0] + script + Module.wrapper[1]
      return script
    }

  }

  /**
   * Assign uncaught exceptions and continue.
   */
  process.removeAllListeners('uncaughtException')
  process.on('uncaughtException', function (error) {
    if (context) {
      fail(context, error)
      next()
    } else {
      console.log(error.stack)
    }
  })

  // If forced to quit, ensure the prompt is on a new line.
  process.removeAllListeners('SIGINT')
  process.on('SIGINT', function () {
    stream.write('\n\n')
    process.exit()
  })

  /**
   * If continuing past failed assertions, listen for results.
   */
  if (!options.assertive) {
    Emitter.decorate(scope.is)
    scope.is.removeAllListeners('result')
    scope.is.on('result', function (result) {
      if (result instanceof Error) {
        fail(context, result)
      }
      context.results = context.results || []
      context.results.push(result)
    })
  }

  function bubble (parent, key, value) {
    while (parent) {
      parent[key] = value
      parent = parent.parent
    }
  }

  /**
   * Fail a test or suite on error.
   */
  function fail (context, e) {
    if (!context.error) {
      root.bail = options.bail

      // Ensure we have a stack trace.
      var stack = e.stack
      if (stack === e.toString() || typeof stack !== 'string') {
        e = new Error(e)
        Error.captureStackTrace(e, arguments.callee)
        stack = e.stack
      }

      // Add a stack line to show the line and column of a parsing error.
      if (parsingPath) {

        stack = stack.replace(parserExp, function (match, slice) {
          var pos = [parsingPath]
          // Acorn.
          if (e.loc) {
            slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n')
            pos[1] = e.loc.line
            pos[2] = e.loc.column + 1

          // Esprima.
          } else {
            slice = slice.replace(/^Error: Line \d+/, 'SyntaxError')
            pos[1] = e.lineNumber
            pos[2] = e.column
          }
          // Account for the wrapper on the first line.
          if (pos[1] === 1) {
            pos[2] -= 17
          }
          return slice.replace(/\n/, '\n    at ' + pos.join(':') + '\n')
        })
        parsingPath = ''
      }

      // Add the error to the current suite or test.
      context.error = stack

      // Show a red X, or a post-test error if using the console reporter.
      if (showProgress) {
        reporter.fail(stack)
      }
    }
  }

  /**
   * Create a suite or test.
   */
  function Node (name, fn, only, skip) {
    var node = this
    Object.defineProperty(node, 'parent', {
      enumerable: false,
      value: suite
    })
    node.name = name
    node.fn = fn
    node.phase = WAIT
    node.started = -1
    node.index = 0
    if (suite) {
      node.timeLimit = suite.timeLimit
      node.hasOnly = false
      node.only = (suite.only && !skip) || only || false
      node.skip = suite.skip || skip || false
      suite.children.push(node)
      if (only) {
        bubble(suite, 'hasOnly', true)
      }
    } else {
      node.timeLimit = options.timeout
      node.skip = node.only = node.hasOnly = false
    }
  }

  /**
   * Set a suite or test's time limit, and start the timer.
   */
  Node.prototype.timeout = function (time) {
    var node = this
    node.timeLimit = time
    clearTimeout(Node.timer)
    if (time > 0) {
      Node.timer = setTimeout(function () {
        fail(context, new Error('Timeout of ' + time + 'ms exceeded.'))
        next()
      }, time)
    }
  }

  /**
   * Run the next phase or function of the current suite or test.
   */
  function next () {
    var i, j, l, fns, fn, key, prepStack
    while (true) {
      if (!node) {
        root.timeout(0)
        return finishTree()
      }
      var isSuite = node.children ? true : false
      if (isSuite) {
        suite = node
      }

      switch (node.phase) {

        case WAIT:
          node.started = Date.now()
          if (node.file && !root.started[node.file]) {
            root.started[node.file] = node.started
          }
          node.phase = BEFORE
          // If it's a suite, run its function to discover contents.
          if (isSuite) {
            suite = context = node
            fn = node.fn
            break
          } // jshint ignore:line

        case BEFORE:
          fns = (isSuite ? node.before : prep[0])
          if (fns) {
            break
          } // jshint ignore:line

        case RUN:
          context = node
          node.index = 0
          if (isSuite) {
            suite = node
            // Push `beforeEach`/`afterEach` functions into the `prepStack`.
            for (i = 0; i < 2; i++) {
              key = prepKeys[i]
              fns = node[key]
              if (fns) {
                prepStack = prep[i] = prep[i] || []
                if (typeof fns === 'function') {
                  prepStack.push(fns)
                  node[key] = 1
                } else if (fns instanceof Array) {
                  for (j = 0, l = fns.length; j < l; j++) {
                    prepStack.push(fns[j])
                  }
                  node[key] = fns.length
                }
                fns = null
              }
            }
            node.phase = CHILDREN
          } else {
            fn = node.fn
            node.phase = AFTER
            break
          } // jshint ignore:line

        case CHILDREN:
          if (node.isBenchmark) {
            fns = runBenchmark
            break
          }
          var child = node.children[node.index++]
          if (child) {
            if (child.children) {
              node = child
            } else if (child.skip || !child.fn || (root.hasOnly && !child.only)) {
              if (showProgress) {
                reporter[child.fn ? 'skip' : 'stub']()
              }
            } else {
              node = child
            }
            continue
          } else {
            // Pop `beforeEach`/`afterEach` functions from `prep` stacks.
            for (i = 0; i < 2; i++) {
              key = prepKeys[i]
              l = node[key]
              if (l) {
                prepStack = prep[i]
                prepStack.splice(prepStack.length - l, l)
              }
            }
          } // jshint ignore:line

        case AFTER:
          if (isSuite) {
            fns = node.after
            context = node
          } else {
            fns = prep[1]
          }
          if (fns) {
            break
          }
          node.phase = END; // jshint ignore:line

        case END:
          var now = Date.now()
          node.time = now - node.started
          if (node.file) {
            root.times[node.file] = now - root.started[node.file]
          }
          if (!isSuite) {
            if (showProgress) {
              reporter.pass()
            }
          }
          node = root.bail ? null : node.parent
          continue
      }

      if (fns) {
        if (typeof fns === 'function') {
          fn = fns
          node.phase++
        } else {
          fn = fns[node.index++]
        }
        fns = null
      }
      if (fn) {
        if (asyncPattern.test(fn.toString())) {
          var ctx = context
          var isDone = false
          ctx.timeout(ctx.timeLimit)
          try {
            fn.call(ctx, function (e) {
              if ((e instanceof Error) && !ctx.error) {
                fail(ctx, e)
              } else if (isDone && !ctx.error) {
                fail(ctx, new Error('Called `done` multiple times.'))
              } else {
                isDone = true
              }
              next()
            })
            return
          } catch (e) {
            fail(ctx, e)
            isDone = true
          }
        } else {
          (function (ctx) {
            try {
              fn.call(ctx)
            } catch (e) {
              fail(ctx, e)
            }
          })(context)
        }
        fn = null
      } else {
        node.index = 0
        node.phase++
      }
    }
  }

  /**
   * Create a test suite.
   */
  scope.describe = function (name, fn, only, skip) {
    var node = new Node(name, fn, only, skip)
    node.children = []
    if (root && (node.parent === root)) {
      node.file = root.file
    }
    return node
  }

  /**
   * Create a benchmark.
   */
  scope.bench = function () {
    var node = scope.describe.apply(scope, arguments)
    node.isBenchmark = true
    return true
  }

  /**
   * Create a test.
   */
  scope.it = function (name, fn, only, skip) {
    var node = new Node(name, fn, only, skip)
    return node
  }

  // Create `only` and `skip` methods for `it` and `describe`.
  var methods = [scope.describe, scope.it]
  methods.forEach(function (me) {
    me.only = function (name, fn) {
      return me(name, fn, true, false)
    }
    me.skip = function (name, fn) {
      return me(name, fn, false, true)
    }

    // Apply a filter to a function by wrapping it.
    function filterFunction (object, key) {
      var fn = object[key]
      return (object[key] = function (name) {
        var title = suite ? suite.title : ''
        title += (title && (name[0] !== '.') ? '' : ' ') + name
        var isMatch = !grep || !root || grep.test(title) || grep.test(root.file)
        if (!ignore || !ignore.test(title)) {
          var item = fn.apply(root, arguments)
          item.title = title
          if (grep) {
            item.isMatch = isMatch
            if (isMatch) {
              bubble(suite, 'hasMatches', true)
            }
          }
          return item
        }
      })
    }

    // Optionally wrap methods with RegExp matching.
    if (grep || ignore) {
      var isTest = (me === scope.it)
      var key = isTest ? 'it' : 'describe'
      var fn = filterFunction(scope, key)
      fn.only = me.only
      fn.skip = me.skip
      filterFunction(fn, 'only')
      filterFunction(fn, 'skip')
    }
  })

  // Create shorthands that other test runners use.
  scope.iit = scope.it.only
  scope.xit = scope.it.skip
  scope.ddescribe = scope.describe.only
  scope.xdescribe = scope.describe.skip

  /**
   * Set a function to be run before a suite's tests.
   */
  scope.before = scope.setup = function (name, fn) {
    addSuiteFunction(suite, 'before', name, fn)
  }

  /**
   * Set a function to be run after a suite's tests.
   */
  scope.after = scope.teardown = function (name, fn) {
    addSuiteFunction(suite, 'after', name, fn)
  }

  /**
   * Set a function to be run before each test in a suite.
   */
  scope.beforeEach = function (name, fn) {
    addSuiteFunction(suite, 'beforeEach', name, fn)
  }

  /**
   * Set a function to be run after each test in a suite.
   */
  scope.afterEach = function (name, fn) {
    addSuiteFunction(suite, 'afterEach', name, fn)
  }

  /**
   * Expose functions that log to the current context.
   */
  var loggers = ['alert', 'debug', 'trace']
  loggers.forEach(function (type) {
    scope[type] = function () {
      var now = Date.now()
      var stringify = reporter.stringify || JSON.stringify
      var args = []
      for (var i = 0, l = arguments.length; i < l; i++) {
        args[i] = stringify(arguments[i])
      }
      var log = {
        file: node.file,
        type: type,
        args: args,
        time: now
      }
      if (type === 'trace') {
        try {
          throw new Error()
        } catch (e) {
          log.stack = e.stack.replace(/^[^\n]*\n[^\n]*\n/, '')
        }
        log.lead = trace.lead
      }
      context.logs = context.logs || []
      context.logs.push(log)
    }
  })
  scope.trace.lead = 5

  /**
   * Add a before/after/beforeEach/afterEach function to a suite.
   */
  function addSuiteFunction (suite, key, name, fn) {
    if (typeof name === 'function') {
      fn = name
      name = key
    }
    // Set a function or an array of functions.
    var fns = suite[key]
    if (!fns) {
      suite[key] = fn
    } else if (typeof fns === 'function') {
      suite[key] = [fns, fn]
    } else if (fns instanceof Array) {
      fns.push(fn)
    } else {
      throw new Error('Attempted to create a preparation function after starting a suite.')
    }
  }

  /**
   * Optionally remove nodes that didn't match the grep option.
   */
  function grepNode (node) {
    var children = node.children
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i]
      // If the node isn't a match, we may prune it.
      if (child && !child.isMatch) {
        // If it has matching children, dive deeper.
        if (child.hasMatches) {
          grepNode(child)

        // If it doesn't match and has no matches, remove it.
        } else {
          children.splice(i--, 1)
        }
      }
    }
  }

  /**
   * After all suites and tests, send results up to the master CPU.
   */
  function finishTree () {
    if (grep) {
      grepNode(root)
    }
    root.options = options
    var data = reporter.finishTree(root, {
      id: options.id,
      times: root.times,
      output: '',
      passed: 0,
      failed: 0,
      hasOnly: root.hasOnly,
      skipped: 0,
      stubbed: 0,
      started: Date.now()
    })
    // In single process mode, finish by delivering data.
    if (options.finish) {
      options.finish(data)

    // Otherwise, write it to the stream.
    } else {
      stream.write(data)
    }
  }

  // Write functions to the appropriate scope.
  var exam = require(__dirname + '/_exam')
  for (var key in scope) {
    exam[key] = scope[key]
    if (!options.noGlobals) {
      global[key] = scope[key]
    }
  }

  // Discover suites and tests by requiring all files assigned to this CPU.
  var root = describe('', function () {
    // Track times for each file.
    root.started = {}
    root.times = {}
    options.files.forEach(function (file) {
      var cwd = process.cwd()
      var path = cwd + '/' + file
      path = path.replace(/^\.\//, cwd + '/')
      root.file = file
      try {
        delete require.cache[path]
        require(path)
      } catch (e) {
        if (!grep || grep.test(path)) {
          var suite = describe('File: ' + path, function () {}, false, false)
          suite.grep = true
          fail(suite, e)
        }
      }
    })
    root.file = null
  })

  var node = root
  var suite = root
  var context = root

  next()

}
