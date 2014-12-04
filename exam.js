#!/usr/bin/env node

var fs = require('fs');
var spawn = require('child_process').spawn;
var tree = tree;
var deepWatch = require('./common/fs/deep-watch');
var exam = module.exports = function (options) {
 var waits, testFiles, assignments, data, isRunning;
 var cwd = process.cwd();
 var manifest = {};
 var cacheDir = cwd + '/.cache/exam';
 var manifestPath = cacheDir + '/manifest.json';
 var reporter = exam[options.reporter];
 var stream = reporter.stream = options.stream || process.stdout;
 var statusTimer;
 start();
 readManifest();
 if (options.watch) {
  var watcher = deepWatch(cwd);
  watcher.on('change', function (file) {
   if (reporter.status) {
    reporter.status('Change found in "' + file + '".');
   }
   if (!isRunning) {
    start();
   }
  });
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
  list.push(error);
 }
 function findTests() {
  var optionsPattern = /\/\.exam\.js(on)?$/;
  var testPattern = /\.js$/;
  var testExtensions = ['.js'];
  var ignorePattern = options.ignore;
  options.paths.forEach(read);
  function add(path) {
   if (optionsPattern.test(path)) {
    var config = require(cwd + '/' + path);
    for (var key in config) {
     options[key] = config[key];
    }
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
        if (!found && fs.existsSync(path + extension)) {
         found = true;
         add(path + extension);
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
  if (!testFiles.length) {
   return finish();
  }
  if (!options.multiProcess) {
   waits = 1;
   options.files = testFiles;
   options.finish = receiveResult;
   tree(options);
  }
  else {
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
    var input = JSON.readStream(child.stdout);
    input.on('string', function (text) {
     stream.write(text);
    });
    input.on('object', receiveResult);
    input.on('error', function (error) {
     console.log(error.stack);
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
    data.hasOnly = true;
   }
   if (result.output) {
    data.outputs.push(result.output);
   }
   data.skipped += result.skipped;
   data.passed += result.passed;
   data.failed += result.failed;
   data.stubbed += result.stubbed;
   ['errors', 'logs'].forEach(function (key) {
    if (result[key]) {
     result[key].forEach(function (item) {
      (data[key] = data[key] || []).push(item);
     });
    }
   });
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
  isRunning = false;
  finished = Date.now();
  reporter.finishExam(data);
  process.emit('exam:finished', data);
  if (options.grep || options.ignore) {
   end();
  }
  else {
   var times = data.times;
   var files = manifest.files = manifest.files || {};
   for (var path in times) {
    var newValue = times[path];
    var entry = files[path] = files[path] || {};
    entry.runs = (entry.runs || 0) + 1;
    for (var exponent = 0; exponent < 4; exponent++) {
     var key = 'avg' + exponent;
     var denominator = Math.min(entry.runs, Math.pow(10, exponent));
     var newPortion = 1 / denominator;
     var oldPortion = 1 - newPortion;
     var oldValue = entry[key] || newValue;
     entry[key] = newValue * newPortion + oldValue * oldPortion;
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
  if (options.done) {
   options.done();
  }
  if ((process.mainModule == module) && !options.watch) {
   process.exit(data.errors ? 1 : 0);
  }
  if (reporter.status) {
   clearTimeout(statusTimer);
   var word = {s: 'second', m: 'minute', h: 'hour', d: 'day'};
   var ms = {s: 1e3, m: 6e4, h: 36e5, d: 864e5};
   ago();
   function ago() {
    var delay = 1e3;
    if (finished) {
     var now = Date.now();
     var t = now - finished;
     var unit = t < ms.m ? 's' : t < ms.h ? 'm' : t < ms.d ? 'h' : 'd';
     var elapsed = Math.floor(t / ms[unit]);
     var text = elapsed + ' ' + word[unit] + (elapsed == 1 ? '' : 's') + ' ago';
     delay = ms[unit] - (t % ms[unit]) + 1;
     reporter.status(text);
    }
    statusTimer = setTimeout(ago, delay);
   }
  }
 }
};
exam.version = '0.2.0';
if (process.mainModule == module) {
 process.nextTick(function () {
  var options = cli({
   options: [
    '-h, --help                Show usage information',
    '-w, --watch               When changes are made, re-run tests',
    '-V, --version             Show the version number',
    '-r, --require <modules>   Require a comma-delimited list of modules (Array)',
    '-R, --reporter <name>     Result reporter ("console", "tap", "xunit" or "counts") [console]',
    '-G, --no-globals          Do not add "it", "describe", etc. to global scope',
    '-v, --recursive           Load test files recursively',
    '-p, --parser <parser>     EcmaScript parser ("acorn", "esprima", or "none") (String) [acorn]',
    '-b, --bail                Exit after the first test failure',
    '-a, --assertive           Stop a test after one failed assertion',
    '-g, --grep <regexp>       Only run files/tests that match a regular expression (RegExp)',
    '-i, --ignore <regexp>     Exclude files/tests that match a regular expression (RegExp)',
    '-d, --debug               Run `node` with the --debug flag',
    '-m, --multi-process       Spawn child processes, creating a cluster of test runners.',
    '-t, --timeout <millis>    Test case timeout in milliseconds (Number) [1000]',
    '-s, --slow <millis>       Slow test (yellow warning) threshold in milliseconds (Number) [10]',
    '-S, --very-slow <millis>  Very slow (red warning) threshold in milliseconds (Number) [100]',
    '-A, --hide-ascii          Do not show ASCII art before the run',
    '-P, --hide-progress       Do not show dots as tests run',
    '-C, --no-colors           Turn off color console logging',
    '-f, --files <files>       HIDDEN (Array)'
   ],
   extras: 'paths',
   version: exam.version
  });
  options.paths[0] = options.paths[0] || 'test';
  options.parser = options.parser.replace(/^no.*/, '');
  if (!/^(acorn|esprima|no.*|)$/.test(options.parser)) {
   console.error('Unknown parser: "' + options.parser + '".');
   console.error('  Expected "acorn", "esprima", or "none".');
   process.exit();
  }
  (options.files ? tree : exam)(options);
 });
}
var Type = function () {};
Type.extend = function (properties) {
 var type = properties.init || function () {
  if (this.init) {
   this.init.apply(this, arguments);
  }
 };
 var parent = type.parent = this;
 Type.decorate(type, parent);
 Type.decorate(type.prototype, parent.prototype);
 Type.decorate(type.prototype, properties);
 return type;
};
Type.decorate = function (object, properties) {
 properties = properties || this.prototype;
 for (var key in properties) {
  object[key] = properties[key];
 }
 return object;
};
var Emitter = Type.extend({
 setMaxListeners: function (max) {
  var self = this;
  self._maxListeners = max ? max : Infinity;
  return self;
 },
 maxListenersExceeded: function (type) {
  var self = this;
  var max = self._maxListeners || Emitter.defaultMaxListeners;
  throw new Error('Max ' + max + ' listeners exceeded for "' + type + '".');
 },
 on: function (type, fn) {
  var self = this;
  var events = self._events = self._events || {};
  var listeners = events[type];
  var max = self._maxListeners || Emitter.defaultMaxListeners;
  if (!listeners) {
   events[type] = fn;
  }
  else if (typeof listeners == 'function') {
   if (max > 1) {
    events[type] = [listeners, fn];
   }
   else {
    self.maxListenersExceeded(type);
   }
  }
  else {
   if (listeners.length < max) {
    listeners.push(fn);
   }
   else {
    self.maxListenersExceeded(type);
   }
  }
  return self;
 },
 once: function (type, fn) {
  var self = this;
  function one() {
   self.removeListener(type, one);
   fn.apply(self, arguments);
  }
  self.on(type, one);
  return self;
 },
 emit: function (type, data) {
  var self = this;
  var events = self._events;
  if (events) {
   var listeners = events[type];
   if (listeners) {
    var args;
    if (arguments.length > 2) {
     args = Array.prototype.slice.call(arguments, 1);
    }
    if (typeof listeners == 'function') {
     if (args) {
      listeners.apply(self, args);
     }
     else {
      listeners.call(self, data);
     }
    }
    else {
     for (var i = 0, l = listeners.length; i < l; i++) {
      if (args) {
       listeners[i].apply(self, args);
      }
      else {
       listeners[i].call(self, data);
      }
     }
    }
   }
  }
  return self;
 },
 listeners: function (type) {
  var self = this;
  var events = self._events;
  var list = events ? events[type] : undefined;
  return !list ? [] : list instanceof Array ? list : [list];
 },
 removeListener: function (type, fn) {
  var self = this;
  var events = self._events;
  if (events) {
   var listeners = events[type];
   if (listeners == fn) {
    delete events[type];
    self.emit('removeListener', type, fn);
   }
   else if (typeof listeners == Array) {
    for (var i = 0, l = listeners.length; i < l; i++) {
     if (listeners[i] == fn) {
      listeners.splice(i, 1);
      return self.emit('removeListener', type, fn);
     }
    }
   }
  }
  return self;
 },
 removeAllListeners: function (type) {
  var self = this;
  var events = self._events;
  if (events) {
   if (type) {
    delete events[type];
   }
   else {
    delete self._events;
   }
  }
  return self;
 }
});
Emitter.defaultMaxListeners = 10;
var snippetStack = function (stack, options) {
 var arrow = (process.platform == 'win32' ? '\u2192' : '\u279C') + ' ';
 options = options || 0;
 var lead = options.lead || 5;
 var trail = options.trail || lead / 2;
 var decay = options.decay || 0.5;
 var indent = options.indent || '  ';
 var color = options.color || 'red';
 var ignore = options.ignore || 0;
 stack = stack.replace(
  /\n +at ([^:\n]+ )?(\(|)(\/[^:]+\/)([^\/:]+):(\d+):(\d+)(\)?)/g,
  function (match, name, start, path, file, line, column, end) {
   if (ignore && ignore.test(path)) {
    return match;
   }
   var shortPath = shortenPath(path);
   var message = '\n' + indent +
    colors.gray + 'at ' +
    (name ? colors.base + name + colors.gray : '') + '(' +
    colors.cyan + shortPath +
    colors.yellow + file + colors.gray + ':' +
    colors.base + line + colors.gray + ':' +
    colors.green + column + colors.gray + ')';
   if (lead >= 1) {
    var lineNumber = line * 1;
    var lines = '';
    try {
     lines += fs.readFileSync(path + file);
    }
    catch (e) {
    }
    lines = lines.split('\n');
    start = Math.max(1, Math.round(lineNumber - lead));
    end = Math.min(lines.length, lineNumber + Math.round(trail));
    var numberLength = ('' + end).length;
    for (i = start; i <= end; i++) {
     line = lines[i - 1];
     var blockIndent = indent + '     ';
     var pipe = '| ';
     if (i == lineNumber) {
      column--;
      line = line.substr(0, column) + line.substr(column).replace(/(;?$)/, '$1'.gray).green;
      blockIndent = indent + '   ' + arrow[color];
      pipe = pipe.gray;
     }
     var n = '' + i;
     n = Array(numberLength - n.length + 1).join(' ') + n;
     message += '\n' + blockIndent + n + pipe + line.replace('\t', '  ') + colors.gray;
    }
    lead *= decay;
    trail *= decay;
   }
   return message;
  }
 );
 stack = stack.replace(/(\n +at )(\S+ )?/g, '\n' + indent + 'at '.gray + '$2' + colors.gray);
 return colors[color] + stack;
};
var path = require('path');
var resolve = path.resolve;
var dirname = path.dirname;
var mkdirp = function (path, mode, fn) {
 path = resolve(path);
 if (typeof mode == 'function') {
  fn = mode;
  mode = 0777 & (~mkdirp.umask);
 }
 mk(path, mode, fn || function () {});
};
function mk(path, mode, fn, dir) {
 mkdirp.fs.mkdir(path, mode, function (error) {
  if (!error) {
   dir = dir || path;
   fn(null, dir);
  }
  else if (error.code == 'ENOENT') {
   mk(dirname(path), mode, function (error, dir) {
    if (error) {
     fn(error, dir);
    }
    else {
     mk(path, mode, fn, dir);
    }
   });
  }
  else {
   mkdirp.fs.stat(path, function (statError, stat) {
    fn((statError || !stat.isDirectory()) ? error : null, dir);
   });
  }
 });
}
mkdirp.fs = require('fs');
mkdirp.umask = process.umask();
var shortenPath = function (path) {
 var dirs = shortenPath.dirs;
 for (var i = 0; i < 2; i++) {
  var dir = dirs[i];
  if (dir[0] && (path.indexOf(dir[0]) === 0)) {
   return dir[1] + path.substr(dir[0].length);
  }
 }
 return path;
};
shortenPath.dirs = [
 [process.cwd() + '/', './'],
 [process.env.HOME + '/', '~/']
];
JSON.colorize = function (data, stack, space, indent, maxWidth, maxDepth) {
 maxWidth = maxWidth || 80;
 maxDepth = maxDepth || 5;
 var type = typeof data;
 var color;
 if (type == 'function') {
  data = data.toString();
  if (stack) {
   data = data.replace(/\s+/g, ' ');
   if (data.length > maxWidth) {
    data = data.replace(/^([^\{]+?)\{.*\}$/, '$1{...}');
   }
   color = 'cyan';
  }
 }
 else if ((type == 'object') && data) {
  if (data instanceof Date) {
   data = data.toUTCString();
   if (stack) {
    data = '[Date: ' + data + ']';
    color = 'cyan';
   }
  }
  else if (data instanceof Error) {
   var e = data;
   var message = (e.stack || '' + e).replace(/^\w*Error:? ?/, '');
   if (stack) {
    data = '[' + (e.name || 'Error') + ': ' + message + ']';
   }
   else {
    data = e.stack || '' + e;
   }
   color = 'cyan';
  }
  else if (data instanceof RegExp) {
   data = '/' + data.source + '/' +
    (data.global ? 'g' : '') +
    (data.ignoreCase ? 'i' : '') +
    (data.multiline ? 'm' : '');
   color = 'green';
  }
  else {
   stack = stack || [];
   indent = indent || space;
   var colon = (space ? ': ' : ':').gray;
   for (var i = 0, l = stack.length; i < l; i++) {
    if (stack[i] == data) {
     return ('[Circular ^' + (l - i) + ']').gray;
    }
   }
   stack.push(data);
   var parts = [];
   var length = 0;
   var text;
   var isArray = (data instanceof Array);
   if (stack.length > maxDepth) {
    data = (isArray ? '[Array]' : '[Object]').cyan;
   }
   else {
    if (isArray) {
     data.forEach(function (value) {
      text = JSON.colorize(value, stack, space, indent + space, maxWidth - 2, maxDepth);
      length += text.replace().length;
      parts.push(text);
     });
    }
    else {
     for (var key in data) {
      if (data.hasOwnProperty(key)) {
       var value = data[key];
       if (/[^$\w\d]/.test(key)) {
        key = '"' + key + '"';
       }
       if (key[0] == '_') {
        key = key.gray;
       }
       text = key + colon + JSON.colorize(value, stack, space, indent + space, maxWidth - 2);
       length += text.plain.length;
       parts.push(text);
      }
     }
    }
    stack.pop();
    if (space) {
     if (parts.length) {
      length += (parts.length - 1) * 2;
     }
     if (length + indent.length > maxWidth) {
      data = '\n' + indent + parts.join(',\n'.gray + indent) + '\n' + indent.substr(2);
     }
     else {
      data = parts.join(', '.gray);
     }
    }
    else {
     data = parts.join(','.gray);
    }
    if (isArray) {
     data = '['.gray + data + ']'.gray;
    }
    else {
     data = '{'.gray + data + '}'.gray;
    }
   }
  }
 }
 else if (stack && !color) {
  if (type == 'string') {
   data = JSON.stringify(data);
   color = 'green';
  }
  else if (type == 'number') {
   color = 'magenta';
  }
  else if (type == 'boolean') {
   color = 'yellow';
  }
  else {
   color = 'red';
  }
 }
 data = '' + data;
 return color ? data[color] : data;
};
var scriptify = JSON.scriptify = function (value, stack) {
 var type = typeof value;
 if (type == 'function') {
  return value.toString();
 }
 if (type == 'string') {
  return JSON.stringify(value);
 }
 if (type == 'object' && value) {
  if (value instanceof Date) {
   return 'new Date(' + value.getTime() + ')';
  }
  if (value instanceof Error) {
   return '(function(){var e=new Error(' + scriptify(value.message) + ');' +
    'e.stack=' + scriptify(value.stack) + ';return e})()';
  }
  if (value instanceof RegExp) {
   return '/' + value.source + '/' +
    (value.global ? 'g' : '') +
    (value.ignoreCase ? 'i' : '') +
    (value.multiline ? 'm' : '');
  }
  var i, length;
  if (stack) {
   length = stack.length;
   for (i = 0; i < length; i++) {
    if (stack[i] == value) {
     return '{"^":' + (length - i) + '}';
    }
   }
  }
  (stack = stack || []).push(value);
  var string;
  if (value instanceof Array) {
   string = '[';
   length = value.length;
   for (i = 0; i < length; i++) {
    string += (i ? ',' : '') + scriptify(value[i], stack);
   }
   stack.pop();
   return string + ']';
  }
  else {
   var i = 0;
   string = '{';
   for (var key in value) {
    string += (i ? ',' : '') +
     (/^[$_a-z][\w$]*$/i.test(key) ? key : '"' + key + '"') +
     ':' + scriptify(value[key], stack);
    i++;
   }
   stack.pop();
   return string + '}';
  }
 }
 return '' + value;
};
JSON.eval = function (js, fallback) {
 delete JSON.eval.error;
 try {
  eval('JSON.eval.value=' + js);
  return JSON.eval.value;
 }
 catch (error) {
  error.message += '\nJS: ' + js;
  JSON.eval.error = error;
  return fallback;
 }
};
JSON.readStream = function (stream, event) {
 var data = '';
 stream.on('data', function (chunk) {
  data += chunk;
  var end = data.indexOf('\n');
  while (end > 0) {
   var line = data.substr(0, end);
   data = data.substr(end + 1);
   var object = JSON.eval(line);
   var error = JSON.eval.error;
   if (error) {
    stream.emit('error', error);
   }
   else {
    stream.emit(event || (typeof object), object);
   }
   end = data.indexOf('\n');
  }
 });
 return stream;
};
JSON.writeStream = function (stream) {
 var write = stream.write;
 stream.write = function (object) {
  var js = JSON.scriptify(object);
  write.call(stream, js + '\n');
 };
 return stream;
};
var argv = process.argv.slice(2);
var cli = function cli(config) {
 config = config || {};
 var main = process.mainModule.filename;
 main.replace(/^(.*[\/\\])([^\.\/\\]+)\.[a-z]+$/g, function (match, path, name) {
  config.name = config.name || name;
  config.dir = config.options ? undefined : path + 'commands'
 });
 config.aliases = config.aliases || {};
 config.aliases.h = config.aliases.h || 'help';
 var command;
 var dir = config.dir;
 if (dir) {
  var command = argv.shift();
  if (!command) {
   config.help = true;
  }
  else if (command == 'help') {
   config.help = true;
   command = argv.shift();
  }
  if (command) {
   config.command = command;
   command = cli.require(dir, command);
   if (command) {
    config.options = command.options;
   }
  }
  if (config.help) {
   cli.help(config);
  }
  else {
   var options = cli.options(command);
   if (typeof command == 'function') {
    command(options);
   }
   else if (typeof command.run == 'function') {
    command.run(options);
   }
  }
 }
 else {
  return cli.options(config);
 }
};
cli.exit = function (message) {
 console.log('\n' + message + '\n');
 process.exit();
};
cli.error = function (message) {
 cli.exit('Error: '.red + message.replace(/("\S.*?\S")/g, '$1'.yellow));
};
cli.require = function (dir, command) {
 try {
  config = require(dir + '/' + command);
 }
 catch (e) {
  return cli.error('Could not find a "' + command + '" command in "' + shortenPath(dir) + '".');
 }
 return config;
};
cli.help = function (config) {
 var name = config.name;
 var dir = config.dir;
 var command = config.command;
 var options = config.options;
 var extras = config.extras;
 var text = 'Usage:\n  ' + name.green;
 if (dir) {
  text += ' <command>'.magenta + ' [options]'.cyan;
  var files;
  try {
   files = fs.readdirSync(dir);
  }
  catch (e) {
   return cli.error('Could not read commands from "' + shortenPath(dir) + '".');
  }
  files.forEach(function (file) {
   command = file.replace(/\..*$/, '');
   text += ''
  });
 }
 else {
  if (options) {
   text += ' [options]'.cyan;
  }
  if (config.extras) {
   text += (' [' + config.extras + '...]').yellow;
  }
  if (options) {
   text += '\n\nOptions: ';
   options.forEach(function (option) {
    if (!/HIDDEN/.test(option)) {
     text += '\n  ' + option
      .replace(/\s*(\(\w+\))?\s*(\[.+?\])?$/, function (match, a, b) {
       return b ? '. ' + ('(default: ' + b.substr(1, b.length - 2) + ')').gray : '.';
      })
      .replace(/(<[a-z]+>)/g, '$1'.yellow)
      .replace(/^(.*  )/, '$1'.cyan);
    }
   });
  }
 }
 cli.exit(text);
};
cli.options = function (config) {
 var options = config.options || [];
 var extras = config.extras || 'extras';
 var index;
 var map = {};
 var args = {};
 options.forEach(function (option, index) {
  option = option.split(/  +/);
  var keys = option[0].split(/,? /);
  var type = 'String';
  var count = 0;
  var name = '';
  keys.forEach(function (key) {
   if (key[0] == '<') {
    count++;
   }
   else {
    if (key.length > name.length) {
     name = key;
    }
   }
  });
  var property = name.replace(/^-+/, '');
  property = property.replace(/-[a-z]/g, function (match) {
   return match[1].toUpperCase();
  });
  var description = option[1]
   .replace(/\s*\[(.+?)\]$/, function (match, value) {
    args[property] = value;
    return '';
   })
   .replace(/\s*\((\w+)\)$/, function (match, value) {
    type = value;
    return '';
   });
  option = [property, type, count, description];
  keys.forEach(function (key) {
   if (key[0] !== '<') {
    map[key] = option;
   }
  });
 });
 args[extras] = [];
 for (index = 0; index < argv.length; index++) {
  argv[index].replace(/^\s*(-*)(.*)\s*$/g, function (match, dash, rest) {
   if (dash == '--') {
    gotOption(match);
   }
   else if (dash == '-') {
    rest.split('').forEach(function (letter) {
     gotOption('-' + letter);
    });
   }
   else {
    args[extras].push(match);
   }
  });
 }
 function gotOption(option) {
  if (map[option]) {
   option = map[option];
   var name = option[0];
   var value = true;
   var count = option[2];
   while (count--) {
    value = argv[++index];
    if (argv.length == index) {
     return cli.error('The "' + name + '" option requires an argument.');
    }
   }
   var type = option[1];
   if (type == 'Array') {
    value = value.split(',');
   }
   else if (type == 'RegExp') {
    try {
     value = new RegExp(value);
    }
    catch (e) {
     return cli.error('The "' + name + '" option received an invalid expression: "' + value + '".');
    }
   }
   else if (type == 'Number') {
    var number = value * 1;
    if (isNaN(number)) {
     return cli.error('The "' + name + '" option received a non-numerical argument: "' + value + '".');
    }
   }
   args[name] = value;
  }
  else {
   return cli.error('Unknown option: "' + option + '".');
  }
 }
 if (args.version && config.version && /^Show/.test(map['--version'][3])) {
  return cli.exit(config.version);
 }
 if (args.help) {
  cli.help(config);
 }
 return args;
};
var colors = {
 reset: '\u001b[0m',
 base: '\u001b[39m',
 bgBase: '\u001b[49m',
 bold: '\u001b[1m',
 normal: '\u001b[2m',
 italic: '\u001b[3m',
 underline: '\u001b[4m',
 inverse: '\u001b[7m',
 hidden: '\u001b[8m',
 strike: '\u001b[9m',
 black: '\u001b[30m',
 red: '\u001b[31m',
 green: '\u001b[32m',
 yellow: '\u001b[33m',
 blue: '\u001b[34m',
 magenta: '\u001b[35m',
 cyan: '\u001b[36m',
 white: '\u001b[37m',
 gray: '\u001b[90m',
 bgBlack: '\u001b[40m',
 bgRed: '\u001b[41m',
 bgGreen: '\u001b[42m',
 bgYellow: '\u001b[43m',
 bgBlue: '\u001b[44m',
 bgMagenta: '\u001b[45m',
 bgCyan: '\u001b[46m',
 bgWhite: '\u001b[47m'
};
if (String.prototype.red) {
 return;
}
var enableColors = true;
Object.defineProperty(String, 'colors', {
 enumerable: false,
 get: function () {
  return enableColors;
 },
 set: function (value) {
  enableColors = value;
  for (var key in colors) {
   if (value) {
    colors[key] = colors['_' + key] || colors[key];
   }
   else {
    colors['_' + key] = colors[key];
    colors[key] = '';
   }
  }
  return enableColors;
 }
});
function define(name, fn) {
 Object.defineProperty(String.prototype, name, {
  enumerable: false,
  get: fn
 });
};
define('plain', function () { return this.replace(/\u001b\[\d+m/g, ''); });
define('reset', function () { return enableColors ? '\u001b[0m' + this : this; });
define('base', function () { return enableColors ? '\u001b[39m' + this : this; });
define('bold', function () { return enableColors ? '\u001b[1m' + this + '\u001b[22m' : this; });
define('normal', function () { return enableColors ? '\u001b[2m' + this + '\u001b[22m' : this; });
define('italic', function () { return enableColors ? '\u001b[3m' + this + '\u001b[23m' : this; });
define('underline', function () { return enableColors ? '\u001b[4m' + this + '\u001b[24m' : this; });
define('inverse', function () { return enableColors ? '\u001b[7m' + this + '\u001b[27m' : this; });
define('hidden', function () { return enableColors ? '\u001b[8m' + this + '\u001b[28m' : this; });
define('strike', function () { return enableColors ? '\u001b[9m' + this + '\u001b[29m' : this; });
define('black', function () { return enableColors ? '\u001b[30m' + this + '\u001b[39m' : this; });
define('red', function () { return enableColors ? '\u001b[31m' + this + '\u001b[39m' : this; });
define('green', function () { return enableColors ? '\u001b[32m' + this + '\u001b[39m' : this; });
define('yellow', function () { return enableColors ? '\u001b[33m' + this + '\u001b[39m' : this; });
define('blue', function () { return enableColors ? '\u001b[34m' + this + '\u001b[39m' : this; });
define('magenta', function () { return enableColors ? '\u001b[35m' + this + '\u001b[39m' : this; });
define('cyan', function () { return enableColors ? '\u001b[36m' + this + '\u001b[39m' : this; });
define('white', function () { return enableColors ? '\u001b[37m' + this + '\u001b[39m' : this; });
define('gray', function () { return enableColors ? '\u001b[90m' + this + '\u001b[39m' : this; });
define('bgBlack', function () { return enableColors ? '\u001b[40m' + this + '\u001b[49m' : this; });
define('bgRed', function () { return enableColors ? '\u001b[41m' + this + '\u001b[49m' : this; });
define('bgGreen', function () { return enableColors ? '\u001b[42m' + this + '\u001b[49m' : this; });
define('bgYellow', function () { return enableColors ? '\u001b[43m' + this + '\u001b[49m' : this; });
define('bgBlue', function () { return enableColors ? '\u001b[44m' + this + '\u001b[49m' : this; });
define('bgMagenta', function () { return enableColors ? '\u001b[45m' + this + '\u001b[49m' : this; });
define('bgCyan', function () { return enableColors ? '\u001b[46m' + this + '\u001b[49m' : this; });
define('bgWhite', function () { return enableColors ? '\u001b[47m' + this + '\u001b[49m' : this; });
var AssertionError = require('assert').AssertionError;
function is(actual, expected) {
 var fn = (actual === expected) ? is.pass : is.fail;
 var op = '===';
 return fn([js(actual), op, js(expected)], is, actual, expected);
}
is.is = is;
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
 var op = ' contains ';
 return fn([js(value), op, js(search)], is.in, search, value);
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
 var op = ' does not contain ';
 return fn([js(value), op, js(search)], is.notIn, search, value);
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
var mock = function mock(object, mockObject) {
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
var unmock = mock.unmock = function unmock(object, keys) {
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
var tree = function (options) {
 options = options || exam.options || getOptions();
 var grep = options.grep;
 var ignore = options.ignore;
 var reporter = exam[options.reporter];
 var stream = reporter.stream = options.stream || process.stdout;
 var showProgress = reporter.init && !options.hideProgress;
 var scope = {};
 if (showProgress) {
  reporter.init(options);
 }
 if (options.multiProcess) {
  JSON.writeStream(stream);
 }
 if (options.require) {
  options.require.forEach(function (module) {
   require(module);
  });
 }
 var timers = require('timers');
 var setTimeout = timers.setTimeout;
 var clearTimeout = timers.clearTimeout;
 var Date = global.Date;
 scope.is = is;
 scope.mock = mock;
 scope.unmock = scope.mock.unmock;
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
   if (path[0] == '/' && path.indexOf('/node_modules/') < 0) {
    parsingPath = path;
   }
   return path;
  };
  Module.wrap = function (script) {
   if (parsingPath) {
    var error;
    var wrapped = 'var f=function(){' + script + '}';
    try {
     eval(wrapped);
    }
    catch (e) {
     parser.parse(wrapped);
    }
    parsingPath = '';
   }
   script = Module.wrapper[0] + script + Module.wrapper[1];
   return script;
  };
 }
 process.removeAllListeners('uncaughtException');
 process.on('uncaughtException', function (error) {
  if (context) {
   fail(context, error);
   next();
  }
  else {
   console.log(error.stack);
  }
 });
 process.removeAllListeners('SIGINT');
 process.on('SIGINT', function () {
  stream.write('\n\n');
  process.exit();
 });
 if (!options.assertive) {
  Emitter.decorate(scope.is);
  scope.is.removeAllListeners('result');
  scope.is.on('result', function (result) {
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
  if (!context.error) {
   root.bail = options.bail;
   var stack = e.stack;
   if (stack == e.toString() || typeof stack != 'string') {
    e = new Error(e);
    Error.captureStackTrace(e, arguments.callee);
    stack = e.stack;
   }
   if (parsingPath) {
    stack = stack.replace(parserExp, function (match, slice) {
     var pos = [parsingPath];
     if (e.loc) {
      slice = slice.replace(/ ?\(\d+:\d+\)\n/, '\n');
      pos[1] = e.loc.line;
      pos[2] = e.loc.column + 1;
     }
     else {
      slice = slice.replace(/^Error: Line \d+/, 'SyntaxError');
      pos[1] = e.lineNumber;
      pos[2] = e.column;
     }
     if (pos[1] == 1) {
      pos[2] -= 17;
     }
     return slice.replace(/\n/, '\n    at ' + pos.join(':') + '\n');
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
  node.started = -1;
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
  clearTimeout(Node.timer);
  if (time > 0) {
   Node.timer = setTimeout(function () {
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
     node.started = Date.now();
     if (node.file && !root.started[node.file]) {
      root.started[node.file] = node.started;
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
     if (isSuite) {
      fns = node.after;
      context = node;
     }
     else {
      fns = prep[1];
     }
     if (fns) break;
     node.phase = END;
    case END:
     var now = Date.now();
     node.time = now - node.started;
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
       if ((e instanceof Error) && !ctx.error) {
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
 scope.describe = function (name, fn, only, skip) {
  var node = new Node(name, fn, only, skip);
  node.children = [];
  if (root && (node.parent == root)) {
   node.file = root.file;
  }
  return node;
 };
 scope.it = function (name, fn, only, skip) {
  var node = new Node(name, fn, only, skip);
  return node;
 };
 [scope.describe, scope.it].forEach(function (me) {
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
   var isTest = (me == scope.it);
   var key = isTest ? 'it' : 'describe';
   var fn = filterFunction(scope, key);
   fn.only = me.only;
   fn.skip = me.skip;
   filterFunction(fn, 'only');
   filterFunction(fn, 'skip');
  }
 });
 scope.iit = scope.it.only;
 scope.xit = scope.it.skip;
 scope.ddescribe = scope.describe.only;
 scope.xdescribe = scope.describe.skip;
 scope.before = scope.setup = function (fn) {
  addSuiteFunction(suite, 'before', fn);
 };
 scope.after = scope.teardown = function (fn) {
  addSuiteFunction(suite, 'after', fn);
 };
 scope.beforeEach = function (fn) {
  addSuiteFunction(suite, 'beforeEach', fn);
 };
 scope.afterEach = function (fn) {
  addSuiteFunction(suite, 'afterEach', fn);
 };
 ['alert', 'debug', 'trace'].forEach(function (type) {
  scope[type] = function () {
   var now = Date.now();
   var stringify = reporter.stringify || JSON.stringify;
   var args = [];
   for (var i = 0, l = arguments.length; i < l; i++) {
    args[i] = stringify(arguments[i]);
   }
   var log = {
    file: node.file,
    type: type,
    args: args,
    time: now
   };
   if (type == 'trace') {
    try {
     throw new Error();
    }
    catch (e) {
     log.stack = e.stack.replace(/^[^\n]*\n[^\n]*\n/, '');
    }
    log.lead = trace.lead;
   }
   (context.logs = context.logs || []).push(log);
  };
 });
 scope.trace.lead = 5;
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
   stubbed: 0,
   started: Date.now()
  });
  if (options.finish) {
   options.finish(data);
  }
  else {
   stream.write(data);
  }
 }

 for (var key in scope) {
  exam[key] = scope[key];
  if (!options.noGlobals) {
   global[key] = scope[key];
  }
 }
 var root = describe('', function () {
  root.started = {};
  root.times = {};
  options.files.forEach(function (file) {
   var cwd = process.cwd();
   var path = cwd + '/' + file;
   path = path.replace(/^\.\//, cwd + '/');
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
var base, red, green, cyan, magenta, yellow, gray, white;
var dot, ex, arrow, bullets;
var width = 100;
var spacer = (new Array(width + 1)).join(' ');
exam.console = {
 init: function (options) {
  this.options = options;
  var isWindows = (process.platform == 'win32');
  if (options.noColors) {
   String.colors = false;
  }
  base = colors.base;
  red = colors.red;
  green = colors.green;
  cyan = colors.cyan;
  magenta = colors.magenta;
  yellow = colors.yellow;
  gray = colors.gray;
  white = colors.white;
  dot = (isWindows ? '.' : '\u00B7');
  ex = red + (isWindows ? '\u00D7' : '\u2716');
  arrow = (isWindows ? '\u2192' : '\u279C') + ' ';
  bullets = {
   passed: green + (isWindows ? '\u221A' : '\u2714') + ' ' + gray,
   failed: ex + ' ',
   skipped: yellow + (isWindows ? '*' : '\u272D') + ' ',
   stubbed: cyan + arrow,
   trace: (isWindows ? '+ ' : '\u271A ').cyan,
   debug: (isWindows ? '÷ ' : '\u2756 ').magenta,
   alert: (isWindows ? '*' : '\u272D ').yellow
  };
 },
 start: function (options) {
  this.init(options);
  if (!options.hideAscii) {
   var version = '0.2.0';
   var art = [
    gray + (new Array(width)).join('='),
    yellow + '  ' + gray + '  _',
    yellow + ' __' + gray + '(O)' + yellow + '__ ' + gray + '   _____           v' + version,
    yellow + '|' + white + '#' + gray + 'A***A' + white + '#' + yellow + '|' + gray + '  | ____)_  __ _ _ _ _ _',
    yellow + '|' + white + '#######' + yellow + '|' + gray + '  |  _) \\ \\/ / _` | ` ` \\',
    yellow + '|' + white + '#######' + yellow + '|' + gray + '  | |___ }  { (_| | | | |',
    yellow + '|' + white + '#######' + yellow + '|' + gray + '  |_____/_/\\_\\__,_|_|_|_|',
    yellow + ' """""""',
    base
   ];
   this.stream.write(art.join('\n'));
  }
 },
 skip: function () {
  this.stream.write(yellow + dot + base);
 },
 stub: function () {
  this.stream.write(cyan + dot + base);
 },
 pass: function () {
  this.stream.write(green + dot + base);
 },
 fail: function () {
  this.stream.write(ex + base);
 },
 status: function (text) {
  this.stream.write('\u001B[3A\n' + gray + ' ' + text + '         \n\n');
 },
 stringify: function (data) {
  return JSON.colorize(data, 0, '  ', '', width - 9);
 },
 finishTree: function (run, data) {
  var options = run.options;
  this.init(options);
  this.stream.write('');
  var hasOnly = data.hasOnly;
  var dive = function (node, indent) {
   var name = node.name;
   var stub = !node.fn;
   var time = node.time;
   var skip = node.skip || (hasOnly && !node.only && !node.hasOnly) || isNaN(time);
   var hide = hasOnly && skip;
   var error = (stub || skip) ? '' : node.error;
   var children = node.children;
   var color = error ? red : stub ? cyan : skip ? yellow : children ? base : gray;
   var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : 'passed';
   var results = node.results;
   var logs = node.logs;
   if (error || logs) {
    var parent = node.parent;
    var title = name;
    while (parent && parent.name) {
     title = parent.name + (title[0] == '.' ? '' : ' ') + title;
     parent = parent.parent;
    }
    title = title.replace(/([^\.])$/, '$1' + gray);
    if (error) {
     (data.errors = data.errors || []).push(title + '\n    ' + snippetStack(error, {
      indent: '      ',
      lead: 5,
      color: 'red'
     }));
    }
    if (logs && !skip) {
     var text = '';
     logs.forEach(function (log) {
      title = title || log.file;
      if (error || (log.type == 'alert')) {
       var lines = [];
       for (var i = 0, l = log.args.length; i < l; i++) {
        lines.push(log.args[i]);
       }
       lines = bullets[log.type] + lines.join('\n').replace(/\n/g, '\n     ');
       if (log.stack) {
        lines += snippetStack('\n' + log.stack, {
         indent: '       ',
         lead: log.lead,
         color: 'cyan'
        });
       }
       text += '\n   ' + lines.replace(/^[^\n]+/, function (first) {
        var emptiness = width - 9 - first.plain.length;
        if (emptiness > 0) {
         first += spacer.substr(0, emptiness);
        }
        var elapsed = log.time - node.started;
        if (!isNaN(elapsed)) {
         first += (' +' + (elapsed || 0) + 'ms').gray;
        }
        return first;
       });
      }
     });
     if (text) {
      (data.logs = data.logs || []).push(' ' + bullets[key] + base + title + text);
     }
    }
   }
   if (name) {
    if (children) {
     if (!hide) {
      data.output += indent + base + name;
     }
    }
    else {
     data[key]++;
     if (!hide) {
      data.output += indent + bullets[key] + name;
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
    indent = (indent ? (indent + '  ').replace(/\n\n/, '\n') : '\n\n ');
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
    var n = index + 1;
    if (n < 10) {
     n = ' ' + n;
    }
    output += '\n\n' + base + n + gray + ') ' + base + error;
   });
  }
  var time = gray + '(' + (data.time || 0) + 'ms)' + base;
  output += '\n\n ' + green + data.passed + ' passed ' + time;
  if (data.failed) {
   output += '\n ' + red + data.failed + ' failed';
  }
  if (data.skipped) {
   output += '\n ' + yellow + data.skipped + ' skipped';
  }
  if (data.stubbed) {
   output += '\n ' + cyan + data.stubbed + ' stubbed';
  }
  var logs = data.logs;
  if (logs) {
   if (!this.options.hideAscii) {
    output += ["\n\n" + gray + (new Array(width)).join('-') + "\n" +
     yellow + "   .   " + gray + "       _         _     " + magenta + "   .   " + gray + "     _     _                    " + cyan + "_" + gray + "     _",
     yellow + "__/*\\__" + gray + "  __ _| |___ _ _| |_   " + magenta + "  /@\\   " + gray + " __| |___| |__ _  _ __ _     " + cyan + "_|#|_" + gray + "  | |_ _ _ __ _ __ ___",
     yellow + "'\\***/'" + gray + " / o` | / o_) \'_|  _|  " + magenta + "<@@@@@> " + gray + "/ o` / o_) 'o \\ || / o` |   " + cyan + "|#####|" + gray + " |  _| '_/ o` / _/ o_)",
     yellow + " /*^*\\ " + gray + " \\__,_|_\\__\\|_|  \\__|  " + magenta + "  \\@/   " + gray + "\\__,_\\__\\|_.__/\\_,_\\__, |     " + cyan + "|#|" + gray + "    \\__|_| \\__,_\\__\\__\\",
     yellow + "       " + gray + "                       " + magenta + "   '    " + gray + "                   |___/" + base].join('\n');
   }
   logs.forEach(function (log) {
    output += '\n\n' + log;
   });
  }
  output += base + '\n\n';
  if (this.options.watch) {
   output += '\n\n';
  }
  this.stream.write(output);
  return output;
 }
};
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
    var time = node.time;
    var skip = node.skip || (hasOnly && !node.only && !node.hasOnly) || isNaN(time);
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
