#!/usr/bin/env node
var fs = require('fs');
var spawn = require('child_process').spawn;
var tree = require('./tree');
var mkdirp = require('../common/fs/mkdirp');
var deepWatch = require('../common/fs/deep-watch');
var cli = require('../common/process/cli');
require('../common/json/read-stream');

// Exam exposes a function that runs a test suite.
var exam = module.exports = function (options) {

  // Save the state of a test run.
  var waits, testFiles, assignments, data, isRunning;

  // Use a manifest to store run times.
  var cwd = process.cwd();
  var manifest = {};
  var cacheDir = cwd + '/.cache/exam';
  var manifestPath = cacheDir + '/manifest.json';

  // Load the chosen reporter.
  var reporter = require('./reporters/' + options.reporter);
  var stream = reporter.stream = options.stream || process.stdout;
  var statusTimer;

  // Start the first run.
  start();
  readManifest();

  // Optionally watch for changes, and restart.
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

  /**
   * Kick off a test run (or re-run).
   */
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

  /**
   * Initialize (or re-initialize) the result set.
   */
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

  /**
   * Decrement the count of async events we're waiting for.
   */
  function unwait() {
    if (!--waits) {
      assignTests();
    }
  }

  /**
   * Read the manifest file (if possible), and ignore errors.
   */
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

  /**
   * Add errors to an array.
   */
  function handleError(error) {
    var list = data.errors = data.errors || [];
    list.push(error);
  }

  /**
   * Read or recurse the file path or directory.
   */
  function findTests() {

    var optionsPattern = /\/\.exam\.js(on)?$/;

    // TODO: Support CoffeeScript, etc.
    var testPattern = /\.js$/;
    var testExtensions = ['.js'];
    var ignorePattern = options.ignore;

    options.paths.forEach(read);

    // Add a test file.
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

    // Read a directory.
    function read(path, index) {
      if (testPattern.test(path)) {
        add(path);
      }
      else {
        waits++;
        fs.readdir(path, function (err, list) {
          if (err) {
            var found = false;
            // Account for (e.g.) "test/apiTest" meaning "test/apiTest.js".
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
              // Assume a file with no dots is a directory.
              if (file.indexOf('.') < 0) {
                if (options.recursive) {
                  read(path);
                }
              }
              // Otherwise, try to add it as a file.
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

  /**
   * If there are test files, assign them to cores for running.
   */
  function assignTests() {
    if (!testFiles.length) {
      return finish();
    }

    // If running in a single process, start a test run tree.
    if (!options.multiProcess) {
      waits = 1;
      options.files = testFiles;
      options.finish = receiveResult;
      tree(options);
    }

    // Otherwise, spawn child processes to run test files.
    else {
      var cpus = require('os').cpus();

      // Prepare to spawn at most once per CPU, and at most once per file.
      var spawnCount = Math.min(testFiles.length, cpus.length);
      var assignments = [];
      for (var i = 0; i < spawnCount; i++) {
        assignments[i] = [];
      }

      // Create a dictionary of file execution times and sort by it.
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

      // Zig-zag over the test files so that the slowest and fastest will be
      // assigned to the same core in the case where there are 2 passes.
      // TODO: Assign more optimally by summing runtimes and juggling buckets.
      var reverse = true;
      testFiles.forEach(function (path, index) {
        var mod = index % spawnCount;
        if (!mod) reverse = !reverse;
        index = reverse ? spawnCount - 1 - mod : mod;
        assignments[index].push(path);
      });

      // Spawn children, and wait for them to return results.
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
          // Errors should not get through the stream, but just in case...
          console.log(error.stack);
        });
        args.pop();
      });
    }
  }

  /**
   * Total all status counts.
   */
  function total(o) {
    return o.skipped + o.passed + o.failed + o.stubbed;
  }

  /**
   * Receive the result of running one or more test files.
   */
  function receiveResult(result) {

    // If another process put us in "only" mode, add counts to "skipped".
    if (data.hasOnly && !result.hasOnly) {
      data.skipped += total(result);
    }
    else {

      // If entering "only" mode now, add previous counts to "skipped".
      if (result.hasOnly && !data.hasOnly) {
        var skip = total(data);
        initResults(data.started);
        data.skipped = skip;
        data.hasOnly = true;
      }
      if (result.output) {
        data.outputs.push(result.output);
      }

      // Increment all counts based on the current data.
      data.skipped += result.skipped;
      data.passed += result.passed;
      data.failed += result.failed;
      data.stubbed += result.stubbed;

      // Add to errors and/or log messages (where applicable).
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

  /**
   * Upon receiving results from all runners, write the report and manifest.
   */
  function finish() {
    isRunning = false;
    finished = Date.now();
    reporter.finishExam(data);
    process.emit('exam:finished', data);

    // If tests were screened by `grep` or `ignore`, exit.
    if (options.grep || options.ignore) {
      end();
    }
    // Otherwise, write the manifest.
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

  /**
   * End an `exam` run, exiting if necessary.
   */
  function end() {
    // If there's a function to run when it's done, run it.
    if (options.done) {
      options.done();
    }
    // If `exam` ran via CLI and we're not watching for changes, exit.
    if ((process.mainModule == module) && !options.watch) {
      process.exit(data.errors ? 1 : 0);
    }

    // Show how long ago it ran.
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

// Expose the module version.
exam.version = require('../package.json').version;

// If Node loaded this file directly, get options and run tests.
if (process.mainModule == module) {
  process.nextTick(function () {

    // Get command line interface options.
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

    // Use "test" as the default path.
    options.paths[0] = options.paths[0] || 'test';

    options.parser = options.parser.replace(/^no.*/, '');
    if (!/^(acorn|esprima|no.*|)$/.test(options.parser)) {
      console.error('Unknown parser: "' + options.parser + '".');
      console.error('  Expected "acorn", "esprima", or "none".');
      process.exit();
    }

    // If testFiles have been assigned, run on one CPU, otherwise get assigments.
    (options.files ? require('./tree') : exam)(options);
  });
}
