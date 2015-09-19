/**
 * Run a benchmark, then call a function to signal it's finished.
 *
 * @param  {Function} done  A function to call when the benchmark is finished.
 */
var runBenchmark = module.exports = function (done) {

  var self = this

  // Limit the execution time to 90% of the allowed time.
  var limit = Date.now() + self.timeLimit * 0.9

  // Number of times to run each child function per pass.
  var sampleSize = self.sampleSize || 100
  var runIndex

  // Ensure a minimum number of passes.
  var minimumSamples = self.minimumSamples || 10
  var passCount = 0

  // Default to 99% confidence.
  var confidentZ = self.z || 2.576

  // Put the children into an array of children to be analyzed.
  var children = Array.prototype.slice.call(self.children)

  // Current child index, start time, and function reference.
  var childIndex
  var child
  var start
  var fn

  // Initialize children for benchmarking.
  children.forEach(initStats)

  // Start the first pass.
  nextPass()

  // Initialize the mean speed and speed variance.
  function initStats (child) {
    child.runCount = 0
    child.speed = 0
    child.variance = 0
  }

  // Incorporate a speed sampling into the mean speed and (running) variance.
  function recordSpeed (child, speed) {
    child.runCount += sampleSize
    child.speed += (speed - child.speed) / passCount
    child.variance += (Math.pow(speed - child.speed, 2) - child.variance) / passCount
  }

  // Initialize a new pass by resetting child and sample indexes.
  function nextPass () {
    passCount++
    childIndex = runIndex = 0
    nextChild()
  }

  // Reference the next child (if possible) and start running its function.
  function nextChild () {
    child = children[childIndex++]
    if (child) {
      fn = child.fn
      runIndex = 0
      var runFn = /^function.*?\([^\s\)]/.test(fn.toString()) ? runAsync : runSync
      start = process.hrtime()
      runFn()
    } else {
      calculateStats()
    }
  }

  // Run the current child's test function synchronously.
  function runSync () {
    for (runIndex = 0; runIndex < sampleSize; runIndex++) {
      fn.call(child)
    }
    finishChild()
  }

  // Run the current child's test function asynchronously.
  function runAsync () {
    if (runIndex++ < sampleSize) {
      fn.call(child, function () {
        setTimeout(runAsync, 0)
      })
    } else {
      finishChild()
    }
  }

  function finishChild () {
    var end = process.hrtime()
    var nanos = (end[0] - start[0]) * 1e9 + end[1] - start[1]
    recordSpeed(child, sampleSize / nanos * 1e9)
    nextChild()
  }

  function sortBySpeed (array) {
    array.sort(function (a, b) {
      return b.speed - a.speed
    })
  }

  function calculateStats () {
    // Sort children by speed, descending.
    sortBySpeed(children)

    // Perform Z-tests.
    for (var i = children.length - 1; i > 0; i--) {

      // Compare each child to the fastest.
      var slow = children[i]
      var fast = children[0]

      // Calculate a worst-case standard error by adding variances.
      var variance = fast.variance + slow.variance
      var error = Math.sqrt(variance / passCount)

      // Calculate a Z value.
      var z = (fast.speed - slow.speed) / error

      // If we're confident one is slower, pop it.
      if (z > confidentZ && passCount >= minimumSamples) {
        var child = children.pop()
        child.slower = true

      // Otherwise, continue testing.
      } else {
        break
      }
    }

    // If we haven't found a winner or timed out, do another pass.
    if (children.length > 1 && Date.now() < limit) {
      setTimeout(nextPass, 0)

    // When we're finished, sort children and calculate times.
    } else {
      sortBySpeed(self.children)

      var best = children[0]
      // Time is expressed as number of times slower than the best.
      self.children.forEach(function (child) {
        child.time = best.speed / child.speed
      })
      done()
    }
  }
}
