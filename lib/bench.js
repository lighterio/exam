/**
 * Run a benchmark, then call a function to signal it's finished.
 *
 * @param  {Function} done  A function to call when the benchmark is finished.
 */
var runBenchmark = module.exports = function (done) {

  var node = this;

  // Limit the execution time to 90% of the allowed time.
  var limit = Date.now() + node.timeLimit * 0.9;


  // Number of times to run each child function per pass.
  var sampleRuns = node.sampleRuns || 10;
  var runIndex;

  // Ensure a minimum number of passes.
  var minimumPasses = node.minimumPasses || 10;
  var passCount = 0;

  // Put the children into an array of children to be analyzed.
  var children = Array.prototype.slice.call(node.children);

  // Current child index, start time, and function reference.
  var childIndex;
  var child;
  var start;
  var fn;

  // Initialize nodes for benchmarking.
  children.forEach(initStats);

  // Start the first pass.
  nextPass();

  // Initialize the mean speed and speed variance.
  function initStats(node) {
    node.passes = 0;
    node.speed = 0;
    node.variance = 0;
  }

  // Incorporate a speed sampling into the mean speed and (running) variance.
  function recordSpeed(node, speed) {
    node.passes++;
    node.speed += (speed - node.speed) / passCount;
    node.variance += (Math.pow(speed - node.speed, 2) - node.variance) / passCount;
  }

  // Initialize a new pass by resetting child and sample indexes.
  function nextPass() {
    passCount++;
    childIndex = runIndex = 0;
    nextChild();
  }

  // Reference the next child (if possible) and start running its function.
  function nextChild() {
    child = children[childIndex++];
    if (child) {
      fn = child.fn;
      var runFn = /^function.*?\([^\s\)]/.test(fn.toString()) ? runAsync : runSync;
      start = process.hrtime();
      runFn();
    }
    else {
      calculateStats();
    }
  }

  // Run the current child's test function synchronously.
  function runSync() {
    for (runIndex = 0; runIndex < sampleRuns; runIndex++) {
      fn.call(child);
    }
    finishChild();
  }

  // Run the current child's test function asynchronously.
  function runAsync() {
    if (runIndex++ < sampleRuns) {
      fn.call(child, runAsync);
    }
    else {
      finishChild();
    }
  }

  //
  function finishChild() {
    var end = process.hrtime();
    var nanos = (end[0] - start[0]) * 1e9 + end[1] - start[1];
    recordSpeed(child, sampleRuns / nanos * 1e9);
    nextChild();
  }

  function sortBySpeed(array) {
    array.sort(function (a, b) {
      return b.speed - a.speed;
    });
  }

  function calculateStats() {
    // Sort children by speed, descending.
    sortBySpeed(children);

    // On the 10th pass, start Z-tests to pop the slowest children out.
    if (passCount >= minimumPasses) {
      for (var i = children.length - 1; i > 0; i--) {

        // Get the slowest and next-to-slowest.
        var last = children[i];
        var next = children[i - 1];

        // Calculate a maximum standard error by adding variances.
        var error = Math.sqrt((next.variance + last.variance) / passCount);

        // Calculate the Z value.
        var z = Math.abs(next.speed - last.speed) / error;

        // If we're 99% confident one is slower, pop it.
        if (z > 2.576) {
          var child = children.pop();
          child.slower = true;
        }
        // Otherwise, continue testing.
        else {
          break;
        }
      }
    }

    // If we're still comparing and haven't timed out, do another pass.
    if (children.length > 1 && Date.now() < limit) {
      setImmediate(nextPass);
    }
    // When we're finished, sort the original children by speed, and fabricate times.
    else {
      var best = children[0];
      sortBySpeed(node.children);
      // Time is expressed as number of times slower than the best.
      node.children.forEach(function (child) {
        child.time = best.speed / child.speed;
      });
      done();
    }
  }
}
