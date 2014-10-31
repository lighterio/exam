#!/usr/bin/env node
var fs = require('fs');
var tree = tree;
var exam = module.exports = function (options) {
 options = exam.options || getOptions(options);
 var waits, testFiles, assignments, data, isRunning;
 if (options.watch) {
  var fsWatchCount = 0;
  var watchMap = {}, watchList = [];
  var watchDelay = 1e3, watchStartTime = 0;
 }
 var manifest = {};
 var cacheDir = options.dir + '/.cache/exam';
 var manifestPath = cacheDir + '/manifest.json';
 var reporter = exam[options.reporter];
 var stream = reporter.stream = options.stream;
 start();
 readManifest();
 if (options.watch) {
  watch(options.dir);
  if (options.watchInterval) {
   setInterval(checkRandomFile, options.watchInterval);
  }
 }
 function start() {
  waits = 0;
  testFiles = [];
  isRunning = true;
  initResults();
  if (reporter.start) {
   reporter.start(options);
  }
  findTests();
 }
 function watch(dir) {
  if (!options.ignoreWatch.test(dir)) {
   if (!watchMap[dir]) {
    fs.lstat(dir, function (e, stat) {
     if (!e) {
      var time = stat.mtime.getTime();
      if (stat.isSymbolicLink()) {
       var key = 'ino:' + stat.ino;
       if (!watchMap[key]) {
        fs.stat(dir, function (e, stat) {
         if (!e) {
          if (stat.isDirectory()) {
           addWatchDir(dir, time);
          }
         }
        });
       }
      }
      else if (stat.isDirectory()) {
       addWatchDir(dir, time);
      }
     }
    });
   }
  }
 }
 function addWatchDir(dir, mtime) {
  if (!watchMap[dir] && watchList.length <= options.watchLimit) {
   watchMap[dir] = mtime;
   watchList.push(dir);
   watchList.sort(function (a, b) {
    return watchMap[a] > watchMap[b] ? -1 : 1;
   });
   if (++fsWatchCount <= options.fsWatchLimit) {
    try {
     fs.watch(dir, onChange);
    }
    catch (e) {
    }
   }
   fs.readdir(dir, function (e, files) {
    if (!e) {
     files.forEach(function (file) {
      if (file != '.' && file != '..') {
       watch(dir + '/' + file);
      }
     });
    }
   });
  }
 }
 function checkRandomFile() {
  var random = Math.pow(Math.random(), 3);
  var index = Math.floor(random * watchList.length);
  var dir = watchList[index];
  fs.stat(dir, function (e, stat) {
   if (!e && (stat.mtime > watchStartTime)) {
    onChange();
   }
  });
 }
 function onChange() {
  if (!isRunning && (Date.now() > watchStartTime)) {
   start();
  }
 }
 function initResults(startTime) {
  data = {
   started: startTime || Date.now(),
   outputs: [],
   hasOnly: false,
   passed: 0,
   failed: 0,
   skipped: 0,
   stubbed: 0,
   times: {}
  };
  isRunning = true;
 }
 function unwait() {
  if (!--waits) {
   assignTests();
  }
 }
 function readManifest() {
  waits++;
  fs.readFile(manifestPath, function (e, content) {
   try {
    manifest = JSON.parse(content);
   }
   catch (e) {
    manifest = {testFiles: {}};
   }
   unwait();
  });
 }
 function handleError(error) {
  var list = data.errors = data.errors || [];
  list.push('Exam Runner (' + __filename + ')\n' + error.stack);
 }
 function findTests() {
  var optionsPattern = /\/\.exam\.js(on)?$/;
  var testPattern = /\.js$/;
  var testExtensions = ['.js'];
  var ignorePattern = options.ignore;
  options.paths.forEach(read);
  function add(path) {
   if (optionsPattern.test(path)) {
    var config = require(options.dir + '/' + path);
    for (var key in config) {
     options[key] = config[key];
    }
    options.optionify();
   }
   else if (testPattern.test(path) && !(ignorePattern && ignorePattern.test(path))) {
    testFiles.push(path);
   }
  }
  function read(path, index) {
   if (testPattern.test(path)) {
    add(path);
   }
   else {
    waits++;
    fs.readdir(path, function (err, list) {
     if (err) {
      var found = false;
      if ((err.code == 'ENOENT') && (typeof index == 'number')) {
       testExtensions.forEach(function (extension) {
        if (!found && fs.existsSync(path + '.js')) {
         found = true;
         add(path + '.js');
        }
       });
      }
      if (!found) {
       handleError(err);
      }
     }
     else {
      list.forEach(function (file) {
       if (file.indexOf('.') < 0) {
        if (options.recursive) {
         read(path);
        }
       }
       else {
        add(path + '/' + file);
       }
      });
     }
     unwait();
    });
   }
  }
 }
 function assignTests() {
  if (!options.multiProcess) {
   waits = 1;
   options.files = testFiles;
   options.finish = receiveResult;
   tree(options);
  }
  else {
   var spawn = require('child_process').spawn;
   var cpus = require('os').cpus();
   var spawnCount = Math.min(testFiles.length, cpus.length);
   var assignments = [];
   for (var i = 0; i < spawnCount; i++) {
    assignments[i] = [];
   }
   var fileTimes = {};
   if (!manifest.files || (manifest.files instanceof Array)) {
    manifest.files = {};
   }
   testFiles.forEach(function (path) {
    var entry = manifest.files[path] || 0;
    var time = entry.avg1 || 0;
    fileTimes[path] = time || 0;
   });
   testFiles.sort(function (a, b) {
    return fileTimes[a] > fileTimes[b] ? -1 : 1;
   });
   var reverse = true;
   testFiles.forEach(function (path, index) {
    var mod = index % spawnCount;
    if (!mod) reverse = !reverse;
    index = reverse ? spawnCount - 1 - mod : mod;
    assignments[index].push(path);
   });
   waits = spawnCount;
   testFiles = [];
   var execPath = __filename;
   var args = process.argv.slice(2);
   if (options.debug) {
    execPath = process.execPath;
    args.unshift(__filename);
    args.unshift('--debug');
   }
   args.push('--files');
   assignments.forEach(function (testFiles, index) {
    args.push(testFiles.join(','));
    var child = spawn(execPath, args);
    var data = '';
    child.stderr.on('data', function (chunk) {
     data += chunk;
     data = data.replace(/<@%(.*?)%@>/g, function (match, json) {
      try {
       var result = JSON.eval(json);
       if (typeof result == 'string') {
        reporter[result]();
       }
       else {
        receiveResult(result);
       }
      }
      catch (e) {
      }
      return '';
     });
    });
    args.pop();
   });
  }
 }
 function total(o) {
  return o.skipped + o.passed + o.failed + o.stubbed;
 }
 function receiveResult(result) {
  if (data.hasOnly && !result.hasOnly) {
   data.skipped += total(result);
  }
  else {
   if (result.hasOnly && !data.hasOnly) {
    var skip = total(data);
    initResults(data.started);
    data.skipped = skip;
   }
   if (result.output) {
    data.outputs.push(result.output);
   }
   data.skipped += result.skipped;
   data.passed += result.passed;
   data.failed += result.failed;
   data.stubbed += result.stubbed;
   if (result.errors) {
    result.errors.forEach(function (error) {
     (data.errors = data.errors || []).push(error);
    });
   }
  }
  var times = result.times;
  for (var path in times) {
   data.times[path] = times[path];
  }
  if (!--waits) {
   data.time = Date.now() - data.started;
   finish();
  }
 }
 function finish() {
  reporter.finishExam(data);
  if (options.timestamp && reporter.timestamp) {
   reporter.timestamp();
  }
  process.emit('exam:finished');
  if (options.grep || options.ignore) {
   end();
  }
  else {
   var times = data.times;
   for (var path in times) {
    if (times.hasOwnProperty(path)) {
     var newValue = times[path];
     var entry = manifest.files[path] || {};
     entry.runs = (entry.runs || 0) + 1;
     for (var exponent = 0; exponent < 4; exponent++) {
      var key = 'avg' + exponent;
      var denominator = Math.min(entry.runs, Math.pow(10, exponent));
      var newPortion = 1 / denominator;
      var oldPortion = 1 - newPortion;
      var oldValue = entry[key] || newValue;
      entry[key] = newValue * newPortion + oldValue * oldPortion;
     }
     manifest.files[path] = entry;
    }
   }
   mkdirp(cacheDir, function (e) {
    if (e) {
     stream.write('Failed to create exam cache directory: "' + cacheDir + '".\n' +  e.stack);
     end();
    }
    else {
     var content = JSON.stringify(manifest, null, '  ');
     fs.writeFile(manifestPath, content, function (e) {
      if (e) {
       stream.write('Failed to write manifest: "' + manifestPath + '".\n' +  e.stack);
      }
      end();
     });
    }
   });
  }
 }
 function end() {
  isRunning = false;
  watchStartTime = Date.now() + watchDelay;
  if (options.done) {
   options.done();
  }
  if ((process.mainModule == module) && !options.watch) {
   process.exit();
  }
 }
};
exam.version = '0.1.5';
if ((process.mainModule == module) && !exam.options) {
 var examOptions = exam.options = exam.options || getOptions();
 process.nextTick(function () {
  (examOptions.files ? tree : exam)(examOptions);
 });
}
var Emitter = function () {};
Emitter.prototype = {
 on: function on(type, fn) {
  var events = this._events = this._events || {};
  var listeners = events[type];
  if (!listeners) {
   events[type] = fn;
  }
  else if (typeof listeners == 'function') {
   events[type] = [listeners, fn];
  }
  else {
   listeners.push(fn);
  }
 },
 emit: function (type, data) {
  var events = this._events;
  if (events) {
   var listeners = events[type];
   if (listeners) {
    var n = arguments.length - 1;
    if (n > 1) {
     data = new Array(n);
     while (n) {
      data[--n] = arguments[n + 1];
     }
    }
    if (typeof listeners == 'function') {
     if (n > 1) {
      listeners.apply(this, args);
     }
     else {
      listeners.call(this, data);
     }
    }
    else {
     for (var i = 0, l = listeners.length; i < l; i++) {
      if (n > 1) {
       listeners[i].apply(this, args);
      }
      else {
       listeners[i].call(this, data);
      }
     }
    }
   }
  }
 }
};
Emitter.extend = function (emitter) {
 var proto = Emitter.prototype;
 emitter = emitter || {};
 for (var key in proto) {
  if (proto.hasOwnProperty(key)) {
   emitter[key] = proto[key];
  }
 }
 return emitter;
};
var path = require('path');
var mkdirp = function (p, m, f) {
 p = path.resolve(p);
 if (typeof m == 'function') {
  f = m;
  m = 493;
 }
 mk(p, m, f || function () {});
};
mkdirp.fs = require('fs');
function mk(p, m, f, d) {
 mkdirp.fs.mkdir(p, m, function (e) {
  if (!e) {
   d = d || p;
   f(null, d);
  }
  else if (e.code == 'ENOENT') {
   mk(path.dirname(p), m, function (e, d) {
    if (e) {
     f(e, d);
    }
    else {
     mk(p, m, f, d);
    }
   });
  }
  else {
   mkdirp.fs.stat(p, function (e2, stat) {
    f((e2 || !stat.isDirectory()) ? e : null, d);
   });
  }
 });
}
JSON.scriptify = js;
JSON.eval = function (s) {
 try {
  eval('eval.o=' + s);
  return eval.o;
 }
 catch (e) {
  eval.e = e;
 }
};
function js(v, a) {
 var t = typeof v;
 if (t == 'function') {
  return v.toString();
 }
 if (t == 'string') {
  return '"' + v.replace(/["\t\n\r]/g, function (c) {
   return c == '"' ? '\\"' : c == '\t' ? '\\t' : c == '\n' ? '\\n' : '';
  }) + '"';
 }
 if (t == 'object' && v) {
  if (v instanceof Date) {
   return 'new Date(' + v.getTime() + ')';
  }
  if (v instanceof Error) {
   return '(function(){var e=new Error(' + js(v.message) + ');' +
    'e.stack=' + js(v.stack) + ';return e})()';
  }
  if (v instanceof RegExp) {
   return '/' + v.source + '/' +
    (v.global ? 'g' : '') +
    (v.ignoreCase ? 'i' : '') +
    (v.multiline ? 'm' : '');
  }
  var i, l;
  if (a) {
   l = a.length;
   for (i = 0; i < l; i++) {
    if (a[i] == v) {
     return '{"^":' + (l - i) + '}';
    }
   }
  }
  (a = a || []).push(v);
  var s;
  if (v instanceof Array) {
   s = '[';
   l = v.length;
   for (i = 0; i < l; i++) {
    s += (i ? ',' : '') + js(v[i], a);
   }
   a.pop();
   return s + ']';
  }
  else {
   var i = 0;
   s = '{';
   for (var k in v) {
    s += (i ? ',' : '') +
     (/^[$_a-z][\w$]*$/i.test(k) ? k : '"' + k + '"') +
     ':' + js(v[k], a);
    i++;
   }
   a.pop();
   return s + '}';
  }
 }
 return '' + v;
}// Throw assertion errors, like any well-behaving assertion library.
var AssertionError = require('assert').AssertionError;
function is(actual, expected) {
 var fn = (actual === expected) ? is.pass : is.fail;
 var op = '===';
 return fn([js(actual), op, js(expected)], is, actual, expected);
}
global.is = is.is = is;
var js = JSON.scriptify;
Object.defineProperty(is, 'stringify', {
 enumerable: false,
 value: js
});
is.pass = function (pieces) {
 if (is.emit) {
  var message = (pieces instanceof Array) ? pieces.join(' ') : (pieces || 'pass');
  is.emit('result', message);
 }
 return is;
};
is.fail = function (pieces, startFunction, actual, expected, operator) {
 if (!operator) {
  operator = expected;
  expected = null;
 }
 var error = new AssertionError({
  actual: actual,
  expected: expected,
  message: (pieces instanceof Array) ? pieces.join(' ') : (pieces || 'fail'),
  operator: operator,
  stackStartFunction: startFunction || is.fail
 });
 if (is.emit) {
  is.emit('result', error);
 }
 else {
  throw error;
 }
 return is;
};
is.not = function (actual, expected) {
 var fn = (actual !== expected) ? is.pass : is.fail;
 var op = '!==';
 return fn([js(actual), op, js(expected)], is.not, actual, expected);
};
is.equal = function (actual, expected) {
 var fn = (actual == expected) ? is.pass : is.fail;
 var op = '==';
 return fn([js(actual), op, js(expected)], is.equal, actual, expected);
};
is.notEqual = function (actual, expected) {
 var fn = (actual != expected) ? is.pass : is.fail;
 var op = '!=';
 return fn([js(actual), op, js(expected)], is.notEqual, actual, expected);
};
is.same = is.deepEqual = function (actual, expected) {
 var fn = (js(actual) == js(expected)) ? is.pass : is.fail;
 var op = 'same';
 return fn([js(actual), op, js(expected)], is.same, actual, expected);
};
is.notSame = is.notDeepEqual = function (actual, expected) {
 var fn = (js(actual) != js(expected)) ? is.pass : is.fail;
 var op = 'notSame';
 return fn([js(actual), op, js(expected)], is.notSame, actual, expected);
};
is.greater = function (first, second) {
 var fn = (first > second) ? is.pass : is.fail;
 var op = '>';
 return fn([js(first), op, js(second)], is.greater, first, second);
};
is.less = function (first, second) {
 var fn = (first < second) ? is.pass : is.fail;
 var op = '<';
 return fn([js(first), op, js(second)], is.less, first, second);
};
is.greaterOrEqual = function (first, second) {
 var fn = (first >= second) ? is.pass : is.fail;
 var op = '>=';
 return fn([js(first), op, js(second)], is.greaterOrEqual, first, second);
};
is.lessOrEqual = function (first, second) {
 var fn = (first <= second) ? is.pass : is.fail;
 var op = '<=';
 return fn([js(first), op, js(second)], is.lessOrEqual, first, second);
};
is.type = function (value, type) {
 var fn = (typeof value == type) ? is.pass : is.fail;
 var op = 'is a ' + type;
 return fn([js(value), op, type], is.type, value, type);
};
is.notType = function (value, type) {
 var fn = (typeof value != type) ? is.pass : is.fail;
 var op = 'is a ' + type;
 return fn([js(value), op, type], is.notType, value, type);
};
is.undefined = function (value) {
 var fn = (typeof value == 'undefined') ? is.pass : is.fail;
 var op = 'is undefined';
 return fn([js(value), op], is.undefined, value);
};
is.notUndefined = is.defined = function (value) {
 var fn = (typeof value != 'undefined') ? is.pass : is.fail;
 var op = 'is defined';
 return fn([js(value), op], is.defined, value);
};
is.boolean = function (value) {
 var fn = (typeof value == 'boolean' || value instanceof Boolean) ? is.pass : is.fail;
 var op = 'is a boolean';
 return fn([js(value), op], is.boolean, value);
};
is.notBoolean = function (value) {
 var fn = (typeof value != 'boolean' && !(value instanceof Boolean)) ? is.pass : is.fail;
 var op = 'is not a boolean';
 return fn([js(value), op], is.notBoolean, value);
};
is.number = function (value) {
 var fn = (typeof value == 'number' || value instanceof Number) ? is.pass : is.fail;
 var op = 'is a number';
 return fn([js(value), op], is.number, value);
};
is.notNumber = function (value) {
 var fn = (typeof value != 'number' && !(value instanceof Number)) ? is.pass : is.fail;
 var op = 'is not a number';
 return fn([js(value), op], is.notNumber, value);
};
is.string = function (value) {
 var fn = (typeof value == 'string' || value instanceof String) ? is.pass : is.fail;
 var op = 'is a string';
 return fn([js(value), op], is.string, value);
};
is.notString = function (value) {
 var fn = (typeof value != 'string' && !(value instanceof String)) ? is.pass : is.fail;
 var op = 'is not a string';
 return fn([js(value), op], is.notString, value);
};
is.function = function (value) {
 var fn = (typeof value == 'function' || value instanceof Function) ? is.pass : is.fail;
 var op = 'is a function';
 return fn([js(value), op], is.function, value);
};
is.notFunction = function (value) {
 var fn = (typeof value != 'function' && !(value instanceof Function)) ? is.pass : is.fail;
 var op = 'is not a function';
 return fn([js(value), op], is.notFunction, value);
};
is.object = function (value) {
 var fn = (typeof value == 'object') ? is.pass : is.fail;
 var op = 'is an object';
 return fn([js(value), op], is.object, value);
};
is.notObject = function (value) {
 var fn = (typeof value != 'object') ? is.pass : is.fail;
 var op = 'is not an object';
 return fn([js(value), op], is.notObject, value);
};
is.instanceOf = function (value, expectedClass) {
 var fn = (typeof expectedClass == 'function' && value instanceof expectedClass) ? is.pass : is.fail;
 var op = 'is an instance of';
 return fn([js(value), op, expectedClass.name], is.instanceOf, value);
};
is.notInstanceOf = function (value, expectedClass) {
 var fn = !(typeof expectedClass == 'function' && value instanceof expectedClass) ? is.pass : is.fail;
 var op = 'is not an instance of';
 return fn([js(value), op, expectedClass.name], is.notInstanceOf, value);
};
is.array = function (value) {
 var fn = (value instanceof Array) ? is.pass : is.fail;
 var op = 'is an Array';
 return fn([js(value), op], is.array, value);
};
is.notArray = function (value) {
 var fn = !(value instanceof Array) ? is.pass : is.fail;
 var op = 'is not an Array';
 return fn([js(value), op], is.notArray, value);
};
is.date = function (value) {
 var fn = (value instanceof Date) ? is.pass : is.fail;
 var op = 'is a Date';
 return fn([js(value), op], is.date, value);
};
is.notDate = function (value) {
 var fn = !(value instanceof Date) ? is.pass : is.fail;
 var op = 'is not a Date';
 return fn([js(value), op], is.notDate, value);
};
is.error = function (value) {
 var fn = (value instanceof Error) ? is.pass : is.fail;
 var op = 'is an Error';
 return fn([js(value), op], is.error, value);
};
is.notError = function (value) {
 var fn = !(value instanceof Error) ? is.pass : is.fail;
 var op = 'is not an Error';
 return fn([js(value), op], is.notError, value);
};
is.regExp = function (value) {
 var fn = (value instanceof RegExp) ? is.pass : is.fail;
 var op = 'is a RegExp';
 return fn([js(value), op], is.regExp, value);
};
is.notRegExp = function (value) {
 var fn = !(value instanceof RegExp) ? is.pass : is.fail;
 var op = 'is not a RegExp';
 return fn([js(value), op], is.notRegExp, value);
};
is.nan = function (value) {
 var fn = isNaN(value) ? is.pass : is.fail;
 var op = 'is NaN';
 return fn([js(value), op], is.nan, value);
};
is.notNan = function (value) {
 var fn = !isNaN(value) ? is.pass : is.fail;
 var op = 'is not NaN';
 return fn([js(value), op], is.notNan, value);
};
is.null = function (value) {
 var fn = (value === null) ? is.pass : is.fail;
 var op = 'is null';
 return fn([js(value), op], is.null, value);
};
is.notNull = function (value) {
 var fn = (value !== null) ? is.pass : is.fail;
 var op = 'is not null';
 return fn([js(value), op], is.notNull, value);
};
is.true = function (value) {
 var fn = (value === true) ? is.pass : is.fail;
 var op = 'is true';
 return fn([js(value), op], is.true, value);
};
is.notTrue = function (value) {
 var fn = (value !== true) ? is.pass : is.fail;
 var op = 'is not true';
 return fn([js(value), op], is.true, value);
};
is.false = function (value) {
 var fn = (value === false) ? is.pass : is.fail;
 var op = 'is false';
 return fn([js(value), op], is.false, value);
};
is.notFalse = function (value) {
 var fn = (value !== false) ? is.pass : is.fail;
 var op = 'is not false';
 return fn([js(value), op], is.false, value);
};
is.truthy = function (value) {
 var fn = value ? is.pass : is.fail;
 var op = 'is truthy';
 return fn([js(value), op], is.truthy, value);
};
is.falsy = function (value) {
 var fn = !value ? is.pass : is.fail;
 var op = 'is falsy';
 return fn([js(value), op], is.falsy, value);
};
is.in = function (value, search) {
 var ok = (typeof value == 'string');
 if (ok) {
  if (search instanceof RegExp) {
   ok = search.test(value);
  }
  else {
   ok = value.indexOf(search) > -1;
  }
 }
 var fn = ok ? is.pass : is.fail;
 var op = 'is in';
 return fn([js(search), op, js(value)], is.in, search, value);
};
is.notIn = function (value, search) {
 var ok = (typeof value == 'string');
 if (ok) {
  if (search instanceof RegExp) {
   ok = search.test(value);
  }
  else {
   ok = value.indexOf(search) > -1;
  }
 }
 var fn = !ok ? is.pass : is.fail;
 var op = 'is not in';
 return fn([js(search), op, js(value)], is.notIn, search, value);
};
is.lengthOf = function (value, length) {
 var fn = (value && (value.length === length)) ? is.pass : is.fail;
 var op = 'has a length of';
 return fn([js(value), op, length], is.lengthOf, value, length);
};
is.notLengthOf = function (value, length) {
 var fn = (!value || (value.length !== length)) ? is.pass : is.fail;
 var op = 'does not have a length of';
 return fn([js(value), op, length], is.notLengthOf, value, length);
};
function isArrayOf(array, expected) {
 var isOk = (array instanceof Array);
 if (isOk) {
  var isString = (typeof expected == 'string');
  array.forEach(function (item) {
   isOk = isOk && (isString ? (typeof item == expected) : (item instanceof expected));
  });
 }
 return isOk;
}
is.arrayOf = function (array, expected) {
 var ex = expected || 'undefined';
 var name = ex.name || ex;
 var fn = (expected && isArrayOf(array, ex)) ? is.pass : is.fail;
 var op = 'is an array of ' + ex + 's';
 return fn([js(array), op, js(name)], is.arrayOf, array, expected);
};
is.notArrayOf = function (array, expected) {
 var ex = expected || 'undefined';
 var name = ex.name || ex;
 var fn = (expected && !isArrayOf(array, ex)) ? is.pass : is.fail;
 var op = 'is not an array of ' + ex + 's';
 return fn([js(array), op, js(name)], is.notArrayOf, array, expected);
};
var mockedObjects = [];
var mockFs;
global.mock = function mock(object, mockObject) {
 var mocked = object._EXAM_MOCKED_ORIGINALS;
 if (!mocked) {
  mocked = [{}, {}];
  Object.defineProperty(object, '_EXAM_MOCKED_ORIGINALS', {
   enumerable: false,
   value: mocked
  });
 }
 for (var key in mockObject) {
  var index = object.hasOwnProperty(key) ? 1 : 0;
  if (typeof mocked[index][key] == 'undefined') {
   mocked[index][key] = object[key];
  }
  object[key] = mockObject[key];
 }
 mockedObjects.push(object);
 return object;
};
global.unmock = function unmock(object, keys) {
 if (!arguments.length) {
  mockedObjects.forEach(function (object) {
   unmock(object);
  });
  mockedObjects.length = 0;
  unmock.fs();
  unmock.time();
  return;
 }
 if (typeof keys == 'string') {
  keys = [keys];
 }
 var mocked = object._EXAM_MOCKED_ORIGINALS;
 if (mocked) {
  for (index = 0; index < 2; index++) {
   var originals = keys || mocked[index];
   for (var key in originals) {
    if (index) {
     object[key] = originals[key];
    }
    else {
     delete object[key];
    }
   }
  }
  if (!keys) {
   delete object._EXAM_MOCKED_ORIGINALS;
  }
 }
 return object;
};
function decorateFn(fn, args) {
 fn.returns = function (value) {
  fn._returns = value;
  return fn;
 };
 return fn;
}
function finishFn(fn) {
 return fn._returns;
}
mock.fn = mock.ignore = function () {
 var fn = function () {
  return finishFn(fn);
 };
 return decorateFn(fn);
};
mock.count = function () {
 function fn(data) {
  fn.value++;
  return finishFn(fn);
 }
 fn.value = 0;
 return decorateFn(fn);
};
mock.set = function (index) {
 function fn(data) {
  fn.value = isNaN(index) ? arguments : arguments[index];
  return finishFn(fn);
 }
 fn.value = [];
 return decorateFn(fn);
};
mock.args = function (index) {
 function fn(data) {
  fn.value.push(isNaN(index) ? arguments : arguments[index]);
  return finishFn(fn);
 }
 fn.value = [];
 return decorateFn(fn);
};
mock.concat = function (delimiter) {
 delimiter = delimiter || '';
 function fn(data) {
  fn.value += (fn.value ? delimiter : '') + data;
  return finishFn(fn);
 }
 fn.value = '';
 return decorateFn(fn);
};
mock.throw = function (message) {
 function fn() {
  var error = new Error(message);
  error.arguments = arguments;
  fn.value.push(error);
  throw error;
 }
 fn.value = [];
 return decorateFn(fn);
};
mock.fs = function (config, newFs) {
 mockFs = require('mock-fs');
 var fs;
 if (newFs) {
  fs = mockFs.fs(config);
 }
 else {
  mockFs(config);
  fs = require('fs');
 }
 return fs;
};
mock.fs.load = function (paths) {
 var load = {};
 paths.forEach(function (path) {
  load[path] = fs.readFileSync(path);
 });
 return load;
};
unmock.fs = function () {
 if (mockFs) {
  mockFs.restore();
  mockFs = null;
 }
};
mock.cpu = function (options) {
 options = options || {};
 if (typeof options.cpus == 'number') {
  options.cpus = unmock(require('os')).cpus().slice(0, options.cpus);
 }
 if (typeof options.hostname == 'string') {
  options.hostname = mock.fn().returns(options.hostname);
 }
 if (options.fork === false) {
  options.fork = mock.fn();
 }
 ['os', 'cluster'].forEach(function (lib) {
  lib = require(lib);
  unmock(lib);
  var mocks = {};
  for (var key in options) {
   if (typeof lib[key] == typeof options[key]) {
    mocks[key] = options[key];
   }
  }
  mock(lib, mocks);
 });
};
unmock.cpu = function () {
 ['os', 'cluster'].forEach(function (lib) {
  unmock(require(lib));
 });
};
var timers = require('timers');
timers.Date = Date;
mock.time = function (value) {
 var date = new timers.Date(value);
 mock.time._CURRENT_TIME = date.getTime();
 mock(timers.Date, {now: MockDate.now});
 global.Date = MockDate;
 global.setTimeout = getScheduler(false);
 global.setInterval = getScheduler(true);
 global.clearTimeout = getUnscheduler();
 global.clearInterval = getUnscheduler();
 return mock.time;
};
function MockDate(value) {
 var innerDate;
 if (arguments.length) {
  innerDate = new timers.Date(value);
 }
 else if (global.Date == timers.Date) {
  innerDate = new timers.Date();
 }
 else {
  innerDate = new timers.Date(mock.time._CURRENT_TIME);
 }
 Object.defineProperty(this, '_INNER_DATE', {
  enumerable: false,
  value: innerDate
 });
}
MockDate.now = function () {
 if (mock.time._CURRENT_TIME === undefined) {
  return realNow();
 }
 else {
  return mock.time._CURRENT_TIME;
 }
};
MockDate.parse = timers.Date.parse;
MockDate.UTC = timers.Date.UTC;
['getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds',
 'getMinutes', 'getMonth', 'getSeconds', 'getTime', 'getTimezoneOffset',
 'getUTCDate', 'getUTCDay', 'getUTCFullYear', 'getUTCHours',
 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds',
 'getYear', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
 'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate',
 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
 'setUTCMonth', 'setUTCSeconds', 'setYear', 'toDateString', 'toGMTString',
 'toISOString', 'toJSON', 'toLocaleDateString', 'toLocaleString',
 'toLocaleTimeString', 'toString', 'toTimeString', 'toUTCString',
 'valueOf'].forEach(function (name) {
 MockDate.prototype[name] = function () {
  return this._INNER_DATE[name].apply(this._INNER_DATE, arguments);
 };
});
mock.time.add = function (time) {
 var p = /(\d+)\s*(s|seconds?)?(m|minutes?)?(h|hours?)?(d|days?)?\b/;
 ('' + time).replace(p, function (match, n, s, m, h, d) {
  mock.time._CURRENT_TIME += +n * (s ? 1e3 : m ? 6e4 : h ? 36e5 : d ? 864e5 : 1);
 });
 runSchedules();
};
mock.time.speed = function (speed, interval) {
 mock.time._SPEED = speed || 1e3;
 moveTime();
};
function moveTime() {
 if (mock.time._SPEED) {
  mock.time._PREVIOUS_TIME = realNow();
  setImmediate(function () {
   var now = realNow();
   var elapsed = now - mock.time._PREVIOUS_TIME;
   if (elapsed) {
    var add = elapsed * mock.time._SPEED;
    mock.time.add(add);
   }
   moveTime();
  });
 }
}
function realNow() {
 return (new timers.Date()).getTime();
}
var schedules = [];
schedules.id = 0;
function getScheduler(isInterval) {
 return function (fn, time) {
  schedules.push({
   id: ++schedules.id,
   fn: fn,
   time: Date.now() + time,
   interval: isInterval ? time : false
  });
 };
}
function getUnscheduler() {
 return function (id) {
  for (var i = 0, l = schedules.length; i < l; i++) {
   var schedule = schedules[i];
   if (schedule.id == id) {
    schedules.splice(i, 1);
    break;
   }
  }
 };
}
function runSchedules() {
 schedules.sort(function (a, b) {
  return b.time - a.time;
 });
 var minNewTime = Number.MAX_VALUE;
 var i = schedules.length - 1;
 var schedule = schedules[i];
 while (schedule && (schedule.time <= mock.time._CURRENT_TIME)) {
  schedule.fn();
  if (!schedule.interval) {
   schedules.splice(i, 1);
  }
  else {
   schedule.time += schedule.interval;
   minNewTime = Math.min(minNewTime, schedule.time);
  }
  schedule = schedules[--i];
 }
 if (minNewTime <= mock.time._CURRENT_TIME) {
  process.nextTick(runSchedules);
 }
}
unmock.time = function () {
 delete mock.time._CURRENT_TIME;
 delete mock.time._SPEED;
 global.Date = timers.Date;
 global.setTimeout = timers.setTimeout;
 global.setInterval = timers.setInterval;
 global.clearTimeout = timers.clearTimeout;
 global.clearInterval = timers.clearInterval;
 schedules.length = 0;
 unmock(timers.Date, 'now');
};
['directory', 'file', 'symlink'].forEach(function (method) {
 mock[method] = function() {
  var mockFs = require('mock-fs');
  return mockFs[method].apply(mockFs, arguments);
 };
});
function getOptions(options) {
 var defaults = {
  parser: 'acorn',
  reporter: 'console',
  slow: 10,
  verySlow: 1e2,
  timeout: 1e3,
  paths: [],
  dir: process.cwd(),
  ignoreWatch: /\/(\.cache|\.git)$/,
  fsWatchLimit: 20,
  watchInterval: 1e2,
  watchLimit: 1e3,
  stream: process.stderr
 };
 if (options) {
  for (var name in defaults) {
   options[name] = options[name] || defaults[name];
  }
 }
 else {
  options = defaults;
  var argv = process.argv;
  var flags = [
   'help|h||Show usage information',
   'version|V||Show the `exam` version number',
   'require|r|<path>|Require a module before each test file',
   'reporter|R|<name>|Result reporter ("console", "tap", "xunit" or "counts")',
   'recursive|v||Load test files recursively',
   'parser|p|<parser>|EcmaScript parser ("esprima", "acorn", or "none")',
   'bail|b||Exit after the first test failure',
   'assertive|B||Stop a test after one failed assertion',
   'grep|g|<pattern>|Only run files/tests that match a pattern',
   'ignore|i|<pattern>|Exclude files/tests that match a pattern',
   'watch|w||When changes are made, re-run tests',
   'ignore-watch|W|<pattern>|Do not watch files that match a pattern',
   'fs-watch-limit|l|<number>|Cap the number of `fs.watch` calls',
   'watch-limit|L|<ms>| Cap the number of `fs.stat` watched directories',
   'fallback-watch-interval|I|<ms>|Milliseconds between `fs.stat` calls for watching',
   'debug|d||Run `node` with the --debug flag',
   'multi-process|m||If true, tests are distributed among CPUs',
   'timeout|t|<ms>|Test case timeout in milliseconds',
   'slow|s|<ms>|Slow test (yellow warning) threshold in milliseconds',
   'very-slow|S|<ms>|Very slow (red warning) threshold in milliseconds',
   'hide-ascii|A||Do not show ASCII art before the run',
   'hide-progress|P||Do not show dots as tests run',
   'no-colors|C||Turn off color console logging',
   'timestamp|T||Show a timestamp after console reporter output',
   'files||<files>|Run tests on a comma-delimited set of files'
  ];
  var map = {};
  flags.forEach(function (flag) {
   flag = flag.split('|');
   map[flag[0]] = flag;
   map[flag[1]] = flag;
  });
  for (var index = 2; index < argv.length; index++) {
   argv[index].replace(/^\s*(-*)(.*)\s*$/g, dashify);
  }
 }
 options.optionify = function () {
  if (options.version) {
   console.log(exam.version);
   process.exit();
  }
  if (!/^(acorn|esprima|no.*|)$/.test(options.parser)) {
   console.error('Unknown parser: "' + options.parser + '".');
   console.error('  Expected "acorn", "esprima", or "none".');
   process.exit();
  }
  options.parser = options.parser.replace(/^no.*/, '');
  options.paths[0] = options.paths[0] || 'test';
  arrayify('require');
  arrayify('files');
  regexpify('grep');
  regexpify('ignore');
  regexpify('ignoreWatch');
  if (options.watch || options.debug) {
   options.multiProcess = true;
  }
 };
 options.optionify();
 function dashify(match, dash, rest) {
  if (dash == '--') {
   gotOption(rest);
  }
  else if (dash == '-') {
   rest.split('').forEach(gotOption);
  }
  else {
   options.paths.push(match);
  }
 }
 function gotOption(flag) {
  var option = map[flag];
  if (option) {
   var name = option[0].replace(/-[a-z]/, function (match) {
    return match[1].toUpperCase();
   });
   options[name] = !options[name];
   var argCount = option[2] ? option[2].split(' ').length : 0;
   while (argCount--) {
    options[name] = argv[++index];
   }
  }
  else {
   console.error('Unknown option: "' + flag + '".');
   process.exit();
  }
 }
 function arrayify(key) {
  if (typeof options[key] == 'string') {
   options[key] = options[key].split(',');
  }
 }
 function regexpify (key) {
  if (typeof options[key] == 'string') {
   options[key] = new RegExp(options[key]);
  }
 }
 return options;
};
var tree = function (options) {
 options = options || exam.options || getOptions();
 var grep = options.grep;
 var ignore = options.ignore;
 var reporter = exam[options.reporter];
 var stream = reporter.stream = options.stream;
 var showProgress = reporter.init && !options.hideProgress;
 if (showProgress) {
  reporter.init(options);
 }
 var timers = require('timers');


 var WAIT = 0;
 var BEFORE = 1;
 var RUN = 2;
 var CHILDREN = 3;
 var AFTER = 4;
 var END = 5;
 var phases = ['WAIT', 'BEFORE', 'RUN', 'CHILDREN', 'AFTER', 'END'];
 var prepKeys = ['beforeEach', 'afterEach'];
 var prep = [null, null];
 var BEFORE_EACH = 0;
 var AFTER_EACH = 1;
 var asyncPattern = /^function.*?\([^\s\)]/;
 if (options.parser && !process.env.running_under_istanbul) {
  var parser = require(options.parser);
  var parserExp = /(^[\s|\S]+?[\/\\](esprima|acorn)\.js:\d+:\d+\))[\s\S]*$/;
  var Module = require('module');
  var resolve = Module._resolveFilename;
  var parsingPath = '';
  Module._resolveFilename = function () {
   var path = resolve.apply(Module, arguments);
   if (path.indexOf('node_modules') < 0) {
    parsingPath = path;
   }
   return path;
  };
  Module.wrap = function (script) {
   if (parsingPath) {
    var error;
    try {
     eval('var f=function(){' + script + '}');
    }
    catch (e) {
     parser.parse(script);
    }
    parsingPath = '';
   }
   script = Module.wrapper[0] + script + Module.wrapper[1];
   return script;
  };
 }
 process.on('uncaughtException', function (error) {
  fail(context, error);
  next();
 });
 process.on('SIGINT', function () {
  stream.write('\n\n');
  process.exit();
 });
 if (!options.assertive) {
  Emitter.extend(is);
  is.on('result', function (result) {
   if (result instanceof Error) {
    fail(context, result);
   }
   (context.results = context.results || []).push(result);
  });
 }
 function stub() {
  if (showProgress) {
   reporter.stub();
  }
 }
 function bubble(parent, key, value) {
  while (parent) {
   parent[key] = value;
   parent = parent.parent;
  }
 }
 function fail(context, e) {
  if (e && !context.error) {
   root.bail = options.bail;
   var stack = e.stack;
   if (stack == e.toString()) {
    e = new Error(e);
    Error.captureStackTrace(e, arguments.callee);
    stack = e.stack;
   }
   if (parsingPath) {
    stack = stack.replace(parserExp, function (match, slice) {
     var pos = parsingPath + ':';
     if (e.loc) {
      slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n');
      pos += e.loc.line + ':' + (e.loc.column + 1);
     }
     else {
      slice = slice.replace(/^Error: Line \d+/, 'SyntaxError');
      pos += e.lineNumber + ':' + e.column;
     }
     return slice.replace(/\n/, '\n    at script (' + pos + ')\n');
    });
    parsingPath = '';
   }
   context.error = stack;
   if (showProgress) {
    reporter.fail(stack);
   }
  }
 }
 function Node(name, fn, only, skip) {
  var node = this;
  node.parent = suite;
  node.name = name;
  node.fn = fn;
  node.phase = WAIT;
  node.time = -1;
  node.index = 0;
  if (suite) {
   node.timeLimit = suite.timeLimit;
   node.hasOnly = false;
   node.only = (suite.only && !skip) || only || false;
   node.skip = suite.skip || skip || false;
   suite.children.push(node);
   if (only) {
    bubble(suite, 'hasOnly', true);
   }
  }
  else {
   node.timeLimit = options.timeout;
   node.skip = node.only = node.hasOnly = false;
  }
 }
 Node.prototype.timeout = function (time) {
  var node = this;
  node.timeLimit = time;
  timers.clearTimeout(Node.timer);
  if (time > 0) {
   Node.timer = timers.setTimeout(function () {
    fail(context, new Error('Timeout of ' + time + 'ms exceeded.'));
    next();
   }, time);
  }
 };
 function next() {
  var i, j, l, fns, fn, key, prepStack, n = 0;
  while (true) {
   if (!node) {
    root.timeout(0);
    return finishTree();
   }
   var name = node.name;
   var phase = node.phase;
   var isSuite = node.children ? true : false;
   if (isSuite) {
    suite = node;
   }
   switch (node.phase) {
    case WAIT:
     node.time = Date.now();
     if (node.file && !root.started[node.file]) {
      root.started[node.file] = node.time;
     }
     node.phase = BEFORE;
     if (isSuite) {
      suite = context = node;
      fn = node.fn;
      break;
     }
    case BEFORE:
     fns = (isSuite ? node.before : prep[0]);
     if (fns) break;
    case RUN:
     context = node;
     node.index = 0;
     if (isSuite) {
      suite = node;
      for (i = 0; i < 2; i++) {
       key = prepKeys[i];
       fns = node[key];
       if (fns) {
        prepStack = prep[i] = prep[i] || [];
        if (typeof fns == 'function') {
         prepStack.push(fns);
         node[key] = 1;
        }
        else if (fns instanceof Array) {
         for (j = 0, l = fns.length; j < l; j++) {
          prepStack.push(fns[j]);
         }
         node[key] = fns.length;
        }
        fns = null;
       }
      }
      node.phase = CHILDREN;
     }
     else {
      fn = node.fn;
      node.phase = AFTER;
      break;
     }
    case CHILDREN:
     var child = node.children[node.index++];
     if (child) {
      if (child.children) {
       node = child;
      }
      else if (child.skip || !child.fn || (root.hasOnly && !child.only)) {
       if (showProgress) {
        reporter[child.fn ? 'skip' : 'stub']();
       }
      }
      else {
       node = child;
      }
      continue;
     }
     else {
      for (i = 0; i < 2; i++) {
       key = prepKeys[i];
       l = node[key];
       if (l) {
        prepStack = prep[i];
        prepStack.splice(prepStack.length - l, l);
       }
      }
     }
    case AFTER:
     fns = (isSuite ? node.after : prep[1]);
     if (fns) break;
     node.phase = END;
    case END:
     var now = Date.now();
     node.time = now - node.time;
     if (node.file) {
      root.times[node.file] = now - root.started[node.file];
     }
     if (!isSuite) {
      if (showProgress) {
       reporter.pass();
      }
     }
     node = root.bail ? null : node.parent;
     continue;
   }
   if (fns) {
    if (typeof fns == 'function') {
     fn = fns;
     node.phase++;
    }
    else {
     fn = fns[node.index++];
    }
    fns = null;
   }
   if (fn) {
    if (asyncPattern.test(fn.toString())) {
     var ctx = context;
     var isDone = false;
     ctx.timeout(ctx.timeLimit);
     try {
      fn.call(ctx, function (e) {
       if (e && !ctx.error) {
        fail(ctx, e);
       }
       else if (isDone && !ctx.error) {
        fail(ctx, new Error('Called `done` multiple times.'));
       }
       else {
        isDone = true;
       }
       next();
      });
      return;
     }
     catch (e) {
      fail(ctx, e);
      isDone = true;
     }
    }
    else {
     (function (ctx) {
      try {
       fn.call(ctx);
      }
      catch (e) {
       fail(ctx, e);
      }
     })(context);
    }
    fn = null;
   }
   else {
    node.index = 0;
    node.phase++;
   }
  }
 }
 global.describe = function (name, fn, only, skip) {
  var node = new Node(name, fn, only, skip);
  node.children = [];
  if (root && (node.parent == root)) {
   node.file = root.file;
  }
  return node;
 };
 global.it = function (name, fn, only, skip) {
  var node = new Node(name, fn, only, skip);
  return node;
 };
 [describe, it].forEach(function (me) {
  me.only = function (name, fn) {
   return me(name, fn, true, false);
  };
  me.skip = function (name, fn) {
   return me(name, fn, false, true);
  };
  function filterFunction(object, key) {
   var fn = object[key];
   return (object[key] = function (name) {
    var title = suite ? suite.title : '';
    title += (title && (name[0] != '.') ? '' : ' ') + name;
    var isMatch = !grep || !root || grep.test(title) || grep.test(root.file);
    if (!ignore || !ignore.test(title)) {
     var item = fn.apply(root, arguments);
     item.title = title;
     if (grep) {
      item.isMatch = isMatch;
      if (isMatch) {
       bubble(suite, 'hasMatches', true);
      }
     }
     return item;
    }
   });
  }
  if (grep || ignore) {
   var isTest = (me == it);
   var key = isTest ? 'it' : 'describe';
   var fn = filterFunction(global, key);
   fn.only = me.only;
   fn.skip = me.skip;
   filterFunction(fn, 'only');
   filterFunction(fn, 'skip');
  }
 });
 global.before = global.setup = function (fn) {
  addSuiteFunction(suite, 'before', fn);
 };
 global.after = global.teardown = function (fn) {
  addSuiteFunction(suite, 'after', fn);
 };
 global.beforeEach = function (fn) {
  addSuiteFunction(suite, 'beforeEach', fn);
 };
 global.afterEach = function (fn) {
  addSuiteFunction(suite, 'afterEach', fn);
 };
 function addSuiteFunction(suite, key, fn) {
  process.assert(typeof fn == 'function', 'Exam `' + key + '` accepts a function as its only argument.');
  var fns = suite[key];
  if (!fns) {
   suite[key] = fn;
  }
  else if (typeof fns == 'function') {
   suite[key] = [fns, fn];
  }
  else if (fns instanceof Array) {
   fns.push(fn);
  }
  else {
   throw new Error('Attempted to create a preparation function after starting a suite.');
  }
 }
 function grepNode(node) {
  var children = node.children;
  for (var i = 0, l = children.length; i < l; i++) {
   var child = children[i];
   if (child && !child.isMatch) {
    if (child.hasMatches) {
     grepNode(child);
    }
    else {
     children.splice(i--, 1);
    }
   }
  }
 }
 function finishTree() {
  if (grep) {
   grepNode(root);
  }
  root.options = options;
  var data = reporter.finishTree(root, {
   id: options.id,
   times: root.times,
   output: '',
   passed: 0,
   failed: 0,
   hasOnly: root.hasOnly,
   skipped: 0,
   stubbed: 0
  });
  if (options.finish) {
   options.finish(data);
  }
  else {
   process.stderr.write('<@%' + JSON.stringify(data) + '%@>');
  }
 }
 var root = describe('', function () {
  root.started = {};
  root.times = {};
  options.files.forEach(function (file) {
   var path = options.dir + '/' + file;
   root.file = file;
   try {
    delete require.cache[path];
    require(path);
   }
   catch (e) {
    if (!grep || grep.test(path)) {
     var suite = describe('File: ' + path, function () {}, false, false);
     suite.grep = true;
     fail(suite, e);
    }
   }
  });
  root.file = null;
 });
 var node = root;
 var suite = root;
 var context = root;
 next();
};
var base, green, red, yellow, cyan, grey, white;
var dot, ex, arrow, bullets;
var bold, normal;
var isChild = false;
exam.console = {
 init: function (options) {
  var isWindows = (process.platform == 'win32');
  var color = !options.noColors;
  base = color ? '\u001b[39m' : '';
  green = color ? '\u001b[32m' : '';
  red = color ? '\u001b[31m' : '';
  yellow = color ? '\u001b[33m' : '';
  cyan = color ? '\u001b[36m' : '';
  grey = color ? '\u001b[90m' : '';
  white = color ? '\u001b[37m' : '';
  bold = color ? '\u001b[1m' : '';
  normal = color ? '\u001b[22m' : '';
  dot = (isWindows ? '.' : '\u00B7');
  ex = red + (isWindows ? '\u00D7' : '\u2716');
  arrow = (isWindows ? '\u2192' : '\u279C') + ' ';
  bullets = {
   passed: green + (isWindows ? '\u221A' : '\u2714') + ' ' + grey,
   failed: ex + ' ',
   skipped: yellow + (isWindows ? '*' : '\u272D') + ' ',
   stubbed: cyan + arrow
  };
  isChild = options.multiProcess && options.files;
 },
 queue: [],
 write: function (chunk, flush) {
  this.queue.push(chunk);
  if (flush || (this.queue.length > 9)) {
   this.stream.write(this.queue.join(''));
   this.queue.length = 0;
  }
 },
 start: function (options) {
  this.init(options);
  if (!options.hideAscii) {
   var version = '0.1.5';
   var art = [
    yellow + '  ' + grey + '  _',
    yellow + ' __' + grey + '(O)' + yellow + '__ ' + grey + '   _____           v' + version,
    yellow + '|' + white + '#' + grey + 'A***A' + white + '#' + yellow + '|' + grey + '  | ____)_  __ _ _ _ _ _',
    yellow + '|' + white + '#######' + yellow + '|' + grey + '  |  _) \\ \\/ / _` | ` ` \\',
    yellow + '|' + white + '#######' + yellow + '|' + grey + '  | |___ }  { (_| | | | |',
    yellow + '|' + white + '#######' + yellow + '|' + grey + '  |_____/_/\\_\\__,_|_|_|_|',
    yellow + ' """""""',
    base
   ];
   this.write(art.join('\n'), true);
  }
 },
 skip: function () {
  this.write(isChild ? '<@%"skip"%@>' : yellow + dot + base);
 },
 stub: function () {
  this.write(isChild ? '<@%"stub"%@>' : cyan + dot + base);
 },
 pass: function () {
  this.write(isChild ? '<@%"pass"%@>' : green + dot + base);
 },
 fail: function () {
  this.write(isChild ? '<@%"fail"%@>' : ex + base);
 },
 timestamp: function () {
  var date = new Date();
  this.write(grey + date.toISOString().replace(/[A-Z]/g, ' ') + base + '\n\n', true);
 },
 finishTree: function (run, data) {
  var options = run.options;
  this.init(options);
  this.write('', true);
  var hasOnly = data.hasOnly;
  var dive = function (node, indent) {
   var name = node.name;
   var stub = !node.fn;
   var skip = node.skip || (hasOnly && !node.only && !node.hasOnly);
   var hide = hasOnly && skip;
   var error = (stub || skip) ? '' : node.error;
   var children = node.children;
   var color = error ? red : skip ? yellow : stub ? cyan : children ? base : grey;
   var results = node.results;
   if (error) {
    var parent = node.parent;
    var title = name;
    while (parent && parent.name) {
     title = parent.name + (title[0] == '.' ? '' : ' ') + title;
     parent = parent.parent;
    }
    title = boldify(title).replace(/([^\.])$/, '$1' + grey + '.' + base);
    (data.errors = data.errors || []).push(title + '\n' + formatStack(error));
   }
   if (name) {
    if (children) {
     if (!hide) {
      data.output += indent + base + boldify(name);
     }
    }
    else {
     var time = node.time;
     var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : time < 0 ? 'skipped' : 'passed';
     data[key]++;
     if (!hide) {
      data.output += indent + bullets[key] + boldify(name);
      if (key == 'passed' && (time >= options.slow)) {
       data.output += (time >= options.verySlow ? red : yellow) + ' (' + time + 'ms)';
      }
      if (error && results) {
       results.forEach(function (result) {
        if (result.message) {
         data.output += indent + '  ' + red + arrow + result.message;
        }
        else {
         data.output += indent + '  ' + green + arrow + result;
        }
       });
      }
     }
    }
   }
   if (children) {
    indent = (indent ? (indent + '  ').replace(/\n\n/, '\n') : '\n\n');
    children.forEach(function (child) {
     dive(child, indent);
    });
   }
  };
  dive(run);
  return data;
 },
 finishExam: function (data) {
  var output = data.outputs.join('');
  var errors = data.errors;
  if (errors) {
   errors.forEach(function (error, index) {
    output += '\n\n' + base + (index + 1) + grey + ') ' + base + error;
   });
  }
  var time = grey + '(' + data.time + 'ms)' + base;
  output += '\n\n' + green + data.passed + ' passed ' + time;
  if (data.failed) {
   output += '\n' + red + data.failed + ' failed';
  }
  if (data.skipped) {
   output += '\n' + yellow + data.skipped + ' skipped';
  }
  if (data.stubbed) {
   output += '\n' + cyan + data.stubbed + ' stubbed';
  }
  output += base + '\n\n';
  this.write(output, true);
  return output;
 }
};
function formatStack(stack) {
 var dirs = [[process.cwd(), '.'], [process.env.HOME, '~']];
 var linesBefore = 5;
 stack = stack.replace(/\u001b/g, '\\u001b');
 stack = stack.replace(/(\n + at )/, grey + '$1');
 stack = stack.replace(
  /\n +at ([^:\n]+ \(|)(\/[^:]+\/)([^\/:]+):(\d+):(\d+)(\)?)/g,
  function (match, start, path, file, line, char, end) {
   var shortPath = path;
   for (var i = 0; i < 2; i++) {
    var dir = dirs[i];
    if (dir[0] && (path.indexOf(dir[0]) === 0)) {
     shortPath = dir[1] + path.substr(dir[0].length);
     break;
    }
   }
   var message = '\n    at ' + (start || '(') +
    cyan + shortPath +
    yellow + file + grey + ':' +
    base + line + grey + ':' +
    green + char + grey + (end || ')');
   if (linesBefore >= 1) {
    var lineNumber = line * 1;
    var lines = '';
    try {
     lines += fs.readFileSync(path + file);
    }
    catch (e) {
    }
    lines = lines.split('\n');
    message += grey;
    start = Math.max(1, lineNumber - linesBefore);
    end = Math.min(lines.length, lineNumber + Math.round(linesBefore / 2));
    var numberLength = ('' + end).length;
    for (i = start; i <= end; i++) {
     line = lines[i - 1];
     var indent = '         ';
     var pipe = '| ';
     if (i == lineNumber) {
      char--;
      line = line.substr(0, char) + green + line.substr(char).replace(/(;?$)/, grey + '$1');
      indent = '       ' + red + arrow;
      pipe = grey + pipe + base;
     }
     var n = '' + i;
     n = Array(numberLength - n.length + 1).join(' ') + n;
     message += '\n' + indent + n + pipe + line.replace('\t', '  ');
    }
    linesBefore -= 2;
   }
   return message;
  }
 );
 stack = stack.replace(/(\n +at )(\S+ )/g, '$1' + base + '$2' + grey);
 return '   ' + red + stack + base;
}
function boldify(text) {
 return text.replace(/`(\S+.*?\S+)`/g, function (match, text) {
  return bold + text + normal;
 });
}
exam.counts = {
 finishTree: function (run, data) {
  var hasOnly = data.hasOnly;
  var dive = function (node) {
   if (node.children) {
    node.children.forEach(function (child) {
     dive(child);
    });
   }
   else {
    var stub = !node.fn;
    var skip = node.skip || (hasOnly && !node.only && !node.hasOnly);
    var error = (stub || skip) ? '' : node.error;
    var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : 'passed';
    data[key]++;
   }
  };
  dive(run);
  return data;
 },
 finishExam: function (data) {
  data = {
   passed: data.passed,
   failed: data.failed,
   skipped: data.skipped,
   stubbed: data.stubbed
  };
  data.total = data.passed + data.failed + data.skipped + data.stubbed;
  var json = JSON.stringify(data);
  this.stream.write(json + '\n');
 }
};
exam.tap = {
 finishTree: function (run, data) {
  data.output = [];
  var dive = function (node) {
   if (node.name) {
    var error = node.error;
    var shouldShow = error || !node.children;
    if (shouldShow) {
     data[error ? 'failed' : 'passed']++;
     var name = node.name;
     var suite = node.parent;
     while (suite && suite.name) {
      name = suite.name + ' ' + name;
      suite = suite.parent;
     }
     name = name.replace(/\n/g, ' ');
     data.output.push(name + (error ? '\n' + error : ''));
    }
   }
   if (node.children) {
    node.children.forEach(dive);
   }
  };
  dive(run);
  return data;
 },
 finishExam: function (data) {
  var stream = this.stream;
  var lines = [];
  data.outputs.forEach(function (output) {
   output.forEach(function (line) {
    lines.push(line);
   });
  });
  stream.write(1 + '...' + lines.length + '\n');
  lines.forEach(function (line, index) {
   var text = line.replace(/\n/g, '\n  ');
   var prefix = text.length > line.length ? 'not ok ' : 'ok ';
   stream.write(prefix + (index + 1) + ' ' + text + '\n');
  });
  stream.write('# tests ' + lines.length + '\n');
  stream.write('# pass ' + data.passed + '\n');
  stream.write('# fail ' + data.failed + '\n');
 }
};
var time;
var replacements = {
 '"': '&quot;',
 '<': '&lt;',
 '>': '&gt;',
 '&': '&amp;'
};
var esc = function (text) {
 return text.replace(/[<&>"]/g, function (match) {
  return replacements[match];
 });
};
exam.xunit = {
 start: function () {
  time = new Date();
 },
 finishTree: function (run, data) {
  var dive = function (node) {
   if (node.name) {
    var error = node.error;
    var shouldShow = error || !node.children;
    if (shouldShow) {
     data[error ? 'failed' : 'passed']++;
     var name;
     var suite = node.parent;
     while (suite && suite.name) {
      name = suite.name + (name ? ' ' + name : '');
      suite = suite.parent;
     }
     var common = 'classname="' + esc(name) + '" ' +
      'name="' + esc(node.name) + '" ' +
      'time="' + (node.time / 1e3) + '"';
     data.output += '<testcase ' + common;
     if (error) {
      var message = error.replace(/\n[\S\s]+/, '');
      data.output += ' message="' + esc(message) + '">' +
       '<failure ' + common + ' ' +
        'message="' + esc(message) + '">' +
        '<![CDATA[' + esc(error) + ']]>' +
        '</failure></testcase>\n';
     }
     else {
      data.output += '/>\n';
     }
    }
   }
   if (node.children) {
    node.children.forEach(dive);
   }
  };
  dive(run);
  return data;
 },
 finishExam: function (data) {
  var stream = this.stream;
  stream.write(
   '<?xml version="1.0" encoding="UTF-8"?>\n' +
   '<testsuite name="Exam" ' +
    'tests="' + (data.passed + data.failed) + '" ' +
    'failures="' + data.failed + '" ' +
    'errors="' + data.failed + '" ' +
    'skipped="0" ' +
    'timestamp="' + (new Date()).toUTCString() + '" ' +
    'time="' + (data.time / 1e3) + '">\n');
  stream.write(data.outputs.join(''));
  stream.write('</testsuite>\n');
 }
};
