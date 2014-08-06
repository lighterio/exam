var run = {
  children: [],
  failed: [],
  waits: 1,
  file: null,
  slowTime: 20,
  slowerTime: 100,
  timeLimit: 2e3,
  isOnly: false,
  isSkip: false
};

var nodes = [];
var nodeIndex = 0;
var time = new Date();
var times = {};
var currentSuite = run;

global.is = require('./is');
global.mock = require('./mock');
global.unmock = global.mock.unmock;
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
var currentPath;

// Capture the path of each module we require.
Module.prototype.require = function (path) {
  assert(path && (typeof path == 'string'), 'path must be a string');
  currentPath = path;
  return Module._load(path, this);
};

// Pre-parse with Acorn or Esprima to prevent non-suppressable error logging.
Module.wrap = function (script) {
  script = Module.wrapper[0] + script + Module.wrapper[1];
  parser.parse(script);
  return script;
};

testFiles.forEach(runTestFile);
nextNode();

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
  result.push(times);
  process.send(result);
  process.exit();
}

function nextNode() {
  var node = nodes[nodeIndex++];
  if (!node) {
    setImmediate(report);
  }
  else {
    var next;
    if (node.title) {
      next = nextNode;
      currentSuite = node;
    }
    else {
      next = node.done;
      currentSuite = node.suite;
      is.setCurrentTest(node);
    }
    setImmediate(function () {
      if (node.before) {
        tryFn(node, node.before, function () {
          tryFn(node, node.fn, next);
        });
      }
      else {
        tryFn(node, node.fn, next);
      }
    });
  }
}

function getTrace(error) {
  return error.stack.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+$/, '$1');
}

function Node(fn, title, does) {
  var node = this;
  node.fn = fn;
  node.title = title;
  node.does = does;
  node.children = [];
  node.results = [];
  node.doneCount = node.waits = 0;
  node.error = node.timer = node.time = null;
  var parent = node.suite = currentSuite;
  node.before = parent.beforeEach;
  node.after = parent.afterEach;
  node.file = parent.file;
  node.isOnly = parent.isOnly;
  node.isSkip = parent.isSkip;
  node.timeLimit = parent.timeLimit;
  parent.children.push(node);
  parent.waits++;
  nodes.push(node);

  node.only = function () {

  };

  node.skip = function () {

  };

  node.done = function (error) {
    if (error && !(error instanceof Error)) {
      console.trace(error);
    }
    clearTimeout(node.timer);
    var count = ++node.doneCount;
    if (count === 2) {
      error = new Error('Called "done()" multiple times.');
    }
    if (error) {
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
        var parent = node.suite;
        if (--parent.waits) {
          nextNode();
        }
        else {
          parent.done();
        }
      };
      if (node.after) {
        tryFn(node.after, node.fn, next);
      }
      else {
        next();
      }
    }
  };

  node.timeout = function (time) {
    clearTimeout(node.timer);
    node.timeLimit = time;
    if ((time > 0) && node.does) {
      node.timer = setTimeout(function () {
        var e = new Error('Timeout of ' + time + 'ms exceeded.');
        node.done(e);
      }, time);
    }
  };
}

function tryFn(node, fn, then) {
  node.time = node.time || new Date();
  var isAsync = /^function.*?\([^\s\)]/.test(fn.toString());
  if (isAsync) {
    node.timeout(node.timeLimit);
    try {
      fn.call(node, then);
    }
    catch (e) {
      node.error = node.error || e;
      e.trace = getTrace(e);
      then();
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
    then();
  }
}

function describe(title, fn) {
  return new Node(fn, title);
}

function it(does, fn) {
  return new Node(fn, null, does);
}

[describe, it].forEach(function (fn) {
  fn.only = function (text, fn) {
    fn(text, fn).only();
  };
  fn.skip = function (text, fn) {
    fn(text, fn).skip();
  };
});

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
