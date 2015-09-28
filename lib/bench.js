function up (node, key, defaultValue) {
  var value
  while (node && !value) {
    value = node[key]
    node = node.parent
  }
  return value ? value : defaultValue
}

/**
 * Run a benchmark, then call a function to signal it's finished.
 *
 * @param  {Function} done  A function to call when the benchmark is finished.
 */
var bench = module.exports = function (done) {

  var self = this

  // Log progress to the console.
  var reporter = require('./reporters/' + self.root.options.reporter)

  // Limit execution time, defaulting to 10 seconds.
  var runTime = up(self, 'benchTime', self.root.options.benchTime)
  var stopTime = Date.now() + runTime

  // Require a level of confidence to declare a winner, defaulting to 99%.
  var confidentZ = up(self, 'z', 2.576)

  // Require crazy confidence to stop testing a loser.
  var stopZ = up(self, 'stopZ', 30)

  // Put the children into an array of children to be analyzed.
  var children = Array.prototype.slice.call(self.children)
  if (!children.length) {
    done()
  }

  // Initialize benchmark data.
  var sampleSize = Math.min(100, runTime)
  var passCount = 0
  var runIndex
  var childIndex
  var child
  var start
  var fn

  // Initialize benchmarking statistics.
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
    if (passCount > 1) {
      var square = Math.pow(speed - child.speed, 2)
      child.variance += (square - child.variance) / (passCount - 1)
    }
    child.speed += (speed - child.speed) / passCount
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
    setTimeout(finishChild, 0)
  }

  // Run the current child's test function asynchronously.
  function runAsync () {
    if (runIndex++ < sampleSize) {
      fn.call(child, function () {
        setTimeout(runAsync, 0)
      })
    } else {
      setTimeout(finishChild, 0)
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

    // Perform Z-tests after the first pass.
    if (passCount > 1) {
      for (var i = children.length - 1; i > 0; i--) {
        // Compare each child to the fastest.
        var slow = children[i]
        var fast = children[0]

        // Calculate a standard error from average variance.
        var variance = (fast.variance + slow.variance) / 2
        var error = Math.sqrt(variance / passCount)

        // Calculate a Z value.
        var z = (fast.speed - slow.speed) / error

        // If we're confident one is slower, record it as such.
        if (z > confidentZ) {
          slow.slower = true

          // If we're super confident, narrow down to the last 2.
          if (z > stopZ && i > 1) {
            children.splice(i, 1)
          }
        }
        else {
          slow.slower = false
        }
        fast.slower = false
      }
    }

    // If there's time, do another pass.
    if (Date.now() < stopTime) {

      // After the 1st pass, adjust sample size using the slowest child.
      if (passCount === 1) {
        sampleSize = Math.ceil(children[children.length - 1].speed / 100)
      }
      setTimeout(nextPass, 0)

    // When we're finished, sort children and calculate times.
    } else {
      sortBySpeed(self.children)

      var best = children[0]
      // Time is expressed as number of times slower than the best.
      self.children.forEach(function (child) {
        child.time = best.speed / child.speed
      })
      reporter.time()
      done()
    }
  }
}
