#!/usr/bin/env node

var fs = require('fs');
var tree = require('./tree');
var mkdirp = require('../common/fs/mkdirp');

// Exam exposes a function that runs a test suite.
var exam = module.exports = function (options) {

  options = require('./options')(options);

  // Save the state of a test run.
  var waits, testFiles, assignments, data, isRunning;

  // Support watching the file system for changes.
  if (options.watch) {
    var fsWatchCount = 0;
    var watchMap = {}, watchList = [];
    var watchDelay = 1e3, watchStartTime = 0;
  }

  // Use a manifest to store run times.
  var manifest = {};
  var cacheDir = options.dir + '/.cache/exam';
  var manifestPath = cacheDir + '/manifest.json';

  // Load the chosen reporter.
  var reporter = require('./reporters/' + options.reporter);
  var stream = reporter.stream = options.stream;

  // Start the first run, and optionally watch for changes.
  start();
  readManifest();
  if (options.watch) {
    watch(options.dir);
    if (options.watchInterval) {
      setInterval(checkRandomFile, options.watchInterval);
    }
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
   * Recurse to find directories we can watch.
   */
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

  /**
   * Add a watchable directory to the map and list of directories we're watching.
   */
  function addWatchDir(dir, mtime) {
    if (!watchMap[dir] && watchList.length <= options.watchLimit) {
      watchMap[dir] = mtime;
      watchList.push(dir);
      watchList.sort(function (a, b) {
        return watchMap[a] > watchMap[b] ? -1 : 1; // Last modified descending.
      });

      // There is a limited number of directories we can use `fs.watch` on.
      if (++fsWatchCount <= options.fsWatchLimit) {
        try {
          fs.watch(dir, onChange);
        }
        catch (e) {
          // `fs.watch` is known to be unstable.
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

  /**
   * Check a pseudorandom file for changes.
   */
  function checkRandomFile() {
    // Weight toward zero so younger directories are checked more often.
    var random = Math.pow(Math.random(), 3);
    var index = Math.floor(random * watchList.length);
    var dir = watchList[index];
    fs.stat(dir, function (e, stat) {
      if (!e && (stat.mtime > watchStartTime)) {
        onChange();
      }
    });
  }

  /**
   * If files change, we can re-run tests.
   */
  function onChange() {
    if (!isRunning && (Date.now() > watchStartTime)) {
      start();
    }
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
    list.push('Exam Runner (' + __filename + ')\n' + error.stack);
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

    // If running in a single process, start a test run tree.
    if (!options.multiProcess) {
      waits = 1;
      options.files = testFiles;
      options.finish = receiveResult;
      tree(options);
    }

    // Otherwise, spawn child processes to run test files.
    else {
      var spawn = require('child_process').spawn;
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
      }
      if (result.output) {
        data.outputs.push(result.output);
      }

      // Increment all counts based on the current data.
      data.skipped += result.skipped;
      data.passed += result.passed;
      data.failed += result.failed;
      data.stubbed += result.stubbed;

      // Add to an array of errors (if applicable).
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

  /**
   * Upon receiving results from all runners, write the report and manifest.
   */
  function finish() {
    reporter.finishExam(data);
    if (options.timestamp && reporter.timestamp) {
      reporter.timestamp();
    }
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
    isRunning = false;
    watchStartTime = Date.now() + watchDelay;
    // If this exam has a function to run when it's done, run it.
    if (options.done) {
      options.done();
    }
    // Otherwise, if `exam` ran via CLI and we're not watching for changes, exit.
    if ((process.mainModule == module) && !options.watch) {
      process.exit(data.errors ? 1 : 0);
    }
  }

};

// Expose the Exam module version.
exam.version = require('../package.json').version;

// If Node loaded this file directly, get options and run tests.
if ((process.mainModule == module) && !exam.options) {
  var examOptions = exam.options = require('./options')();
  process.nextTick(function () {
    // If testFiles have been assigned, run on one CPU, otherwise get assigments.
    (examOptions.files ? require('./tree') : exam)(examOptions);
  });
}
