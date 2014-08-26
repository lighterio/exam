require('./is');
require('./mock');

var run = {
  children: [],
  failed: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeLimit: 2e3,
  hasOnly: false
};

var nodes = [];
var nodeIndex = 0;
var time = new Date();
var times = {};
var currentSuite = run;

global.it = it;
global.describe = describe;
global.before = global.setup = before;
global.after = global.teardown = after;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

var argv = process.argv;
var last = argv[argv.length - 1];
var arg = JSON.parse(last);
var testFiles = arg.files;
var reporter = require('./reporters/' + arg.reporter);
var parser = require(arg.parser);
var parserExp = /(^[\s|\S]+?[\/\\](esprima|acorn)\.js:\d+:\d+\))[\s\S]*$/;
var assert = require('assert');
var Module = require('module');
var fs = require('fs');
var cwd = process.cwd() + '/';
var currentPath;
var isInCwd;
var alreadyParsed = !!process.env.running_under_istanbul;

// Capture the path of each module we require.
var resolve = Module._resolveFilename;
Module._resolveFilename = function () {
  var path = resolve.apply(Module, arguments);
  currentPath = path;
  isInCwd = path.indexOf(cwd) === 0 && path.substr(cwd.length, 12) != 'node_modules';
  return path;
};

// Pre-parse with Acorn or Esprima to prevent non-suppressable error logging.
Module.wrap = function (script) {
  script = Module.wrapper[0] + script + Module.wrapper[1];
  if (isInCwd && !alreadyParsed) {
    parser.parse(script);
  }
  return script;
};

function runTestFile(file) {
  run.file = file;
  times[file] = 0;
  try {
    require(process.cwd() + '/' + file);
  }
  catch (e) {
    e.trace = getTrace(e).replace(parserExp, function (match, slice) {
      var pos = currentPath + ':';
      // Acorn.
      if (e.loc) {
        slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n');
        pos += e.loc.line + ':' + e.loc.column;
      }
      // Esprima.
      else {
        slice = slice.replace(/^Error: Line \d+/, 'SyntaxError');
        pos += e.lineNumber + ':' + e.column;
      }
      return slice.replace(/\n/, '\n    at parseModule (' + pos + ')\n');
    });
    reporter.fail();
    run.failed.push({title: file, errors: [e]});
  }
}

function report() {
  var result = reporter.run(run);
  result.times = times;
  process.send(result);
  process.exit();
}

function nextNode() {
  var node = nodes[nodeIndex++];
  if (node) {
    var next;
    if (node.title) {
      next = nextNode;
      currentSuite = node;
    }
    else {
      var parent = node.parent;
      if (node.skip || (run.hasOnly && !node.only && !parent.hasOnly)) {
        setImmediate(nextNode);
        return;
      }
      else {
        next = node.done;
        currentSuite = parent;
        is.setCurrentTest(node);
      }
    }
    setImmediate(function () {
      var before = node.before;
      var runFn = function () {
        tryFn(node, node.fn, function () {
          var newBefore = node.before;
          if (newBefore != before) {
            tryFn(node, newBefore, next);
          }
          else {
            next();
          }
        });
      };
      if (before) {
        tryFn(node, before, runFn);
      }
      else {
        runFn();
      }
    });
  }
  else {
    setImmediate(report);
  }
}

function getTrace(error) {
  var trace = error.stack;
  trace = trace.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+?$/, '$1');
  return trace;
}

function Node(fn, title, does) {
  var node = this;
  node.fn = fn;
  node.name = title ? 'suite:' + title : 'test:' + does;
  node.title = title;
  node.does = does;
  node.children = [];
  node.results = [];
  node.doneCount = node.waits = 0;
  node.error = node.timer = node.time = null;
  var parent = node.parent = currentSuite;
  node.before = parent.beforeEach;
  node.after = parent.afterEach;
  node.file = parent.file;
  node.timeLimit = parent.timeLimit;
  node.only = (parent.only && !fn._EXAM_SKIP) || fn._EXAM_ONLY || false;
  node.skip = parent.skip || fn._EXAM_SKIP || false;
  parent.children.push(node);
  parent.waits++;
  nodes.push(node);

  if (node.only) {
    while (parent && !parent.hasOnly) {
      parent.hasOnly = true;
      parent = parent.parent;
    }
  }

  node.done = function (error) {
    clearTimeout(node.timer);
    var count = ++node.doneCount;
    if (count === 2) {
      error = new Error('Called "done()" multiple times.');
    }
    if (error instanceof Error) {
      error.trace = getTrace(error);
      reporter.fail();
      node.error = error;
      node.results.push(error);
    }
    else {
      reporter.pass();
    }
    if (count === 1) {
      var next = function () {
        is.setCurrentTest(null);
        var now = new Date();
        node.time = now - node.time;
        times[node.file] = now - time;
        var parent = node.parent;
        if (--parent.waits) {
          if (parent.after) {
            tryFn(parent, parent.after, nextNode);
          }
          else {
            nextNode();
          }
        }
        else {
          parent.done();
        }
      };
      var after = node.after;
      if (after) {
        tryFn(node, after, next);
      }
      else {
        next();
      }
    }
  };

  node.timeout = function (time, done) {
    clearTimeout(node.timer);
    node.timeLimit = time;
    if ((time > 0) && node.does) {
      node.timer = setTimeout(function () {
        var e = new Error('Timeout of ' + time + 'ms exceeded.');
        done(e);
      }, time);
    }
  };
}

function tryFn(node, fn, then) {
  node.time = node.time || new Date();
  var isAsync = /^function.*?\([^\s\)]/.test(fn.toString());
  if (isAsync) {
    var done = fn._EXAM_TEST ? node.done : then;
    node.timeout(node.timeLimit, done);
    try {
      fn.call(node, function () {
        clearTimeout(node.timer);
        setImmediate(then);
      });
    }
    catch (e) {
      clearTimeout(node.timer);
      node.error = node.error || e;
      e.trace = getTrace(e);
      setImmediate(then);
    }
  }
  else {
    try {
      fn.call(node);
    }
    catch (e) {
      node.error = node.error || e;
      e.trace = getTrace(e);
    }
    setImmediate(then);
  }
}

function describe(title, fn) {
  fn._EXAM_TEST = true;
  new Node(fn, title || 'suite');
}

function it(does, fn) {
  new Node(fn, null, does || 'test');
}

function before(fn) {
  currentSuite.before = fn;
}

function after(fn) {
  currentSuite.after = fn;
}

function beforeEach(fn) {
  currentSuite.beforeEach = fn;
}

function afterEach(fn) {
  currentSuite.afterEach = fn;
}

[describe, it].forEach(function (me) {
  me.only = function (text, fn) {
    fn._EXAM_ONLY = true;
    me(text, fn);
  };
  me.skip = function (text, fn) {
    fn._EXAM_SKIP = true;
    me(text, fn);
  };
});

testFiles.forEach(runTestFile);
nextNode();
