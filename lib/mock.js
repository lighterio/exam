/**
 * Keep track of mocked objects so they can all be unmocked.
 */
var mockedObjects = []

/**
 * Allow `mock-fs` to be loaded lazily and referenced.
 */
var mockFs

/**
 * Decorate an object with mocked properties.
 */
var mock = module.exports = function mock (object, mockObject) {
  var mocked = object._EXAM_MOCKED_ORIGINALS
  if (!mocked) {
    mocked = [{}, {}]
    Object.defineProperty(object, '_EXAM_MOCKED_ORIGINALS', {
      enumerable: false,
      value: mocked
    })
  }
  for (var key in mockObject) {
    var index = object.hasOwnProperty(key) ? 1 : 0
    if (typeof mocked[index][key] === 'undefined') {
      mocked[index][key] = object[key]
    }
    object[key] = mockObject[key]
  }
  mockedObjects.push(object)
  return object
}

/**
 * Restore mocked properties to their mocked values.
 */
var unmock = mock.unmock = function unmock (object, keys) {
  // If called with no arguments, unmock all objects that have been mocked.
  if (!arguments.length) {
    mockedObjects.forEach(function (object) {
      unmock(object)
    })
    mockedObjects.length = 0
    unmock.fs()
    unmock.time()
    return
  }
  // If it's a single key, make it an array.
  if (typeof keys === 'string') {
    keys = [keys]
  }
  // If the object has original values for mocked properties, restore them.
  var mocked = object._EXAM_MOCKED_ORIGINALS
  if (mocked) {
    for (var index = 0; index < 2; index++) {
      var originals = keys || mocked[index]
      for (var key in originals) {
        if (index) {
          object[key] = originals[key]
        } else {
          delete object[key]
        }
      }
    }
    // If we weren't deleting specific keys, we no longer need the originals.
    if (!keys) {
      delete object._EXAM_MOCKED_ORIGINALS
    }
  }
  return object
}


/**
 * Decorate a mock function with chainable methods.
 */
function decorateFn (fn) {
  fn.returns = function (value) {
    fn._returns = value
    return fn
  }
  return fn
}

/**
 * Finish the execution of a mock function.
 */
function finishFn (fn) {
  return fn._returns
}

/**
 * Simple mock function: Ignore.
 */
mock.fn = mock.ignore = function () {
  var fn = function () {
    return finishFn(fn)
  }
  return decorateFn(fn)
}

/**
 * Simple mock function: Call counter.
 */
mock.count = function () {
  function fn () {
    fn.value++
    return finishFn(fn)
  }
  fn.value = 0
  return decorateFn(fn)
}

/**
 * Simple mock function: Argument setter.
 */
mock.set = function (index) {
  function fn () {
    fn.value = isNaN(index) ? arguments : arguments[index]
    return finishFn(fn)
  }
  fn.value = []
  return decorateFn(fn)
}

/**
 * Simple mock function: Argument pusher.
 */
mock.args = function (index) {
  function fn () {
    fn.value.push(isNaN(index) ? arguments : arguments[index])
    return finishFn(fn)
  }
  fn.value = []
  return decorateFn(fn)
}

/**
 * Simple mock function: String concatenator.
 */
mock.concat = function (delimiter) {
  delimiter = delimiter || ''
  function fn (data) {
    fn.value += (fn.value ? delimiter : '') + data
    return finishFn(fn)
  }
  fn.value = ''
  return decorateFn(fn)
}

/**
 * Simple mock function: Error thrower.
 */
mock.throw = function (message) {
  function fn () {
    var error = new Error(message)
    error.arguments = arguments
    fn.value.push(error)
    throw error
  }
  fn.value = []
  return decorateFn(fn)
}

// Make a reference to the real file system before mocking.
var fs = require('fs')

/**
 * Load `mock-fs` and create a temporary file system.
 */
mock.fs = function (config, newFs) {
  mockFs = require('mock-fs')
  var fs
  if (newFs) {
    fs = mockFs.fs(config)
  } else {
    mockFs(config)
    fs = require('fs')
  }
  return fs
}

/**
 * Load an array of paths, and return an object for `mock.fs`.
 */
mock.fs.load = function (paths) {
  var load = {}
  paths.forEach(function (path) {
    load[path] = fs.readFileSync(path)
  })
  return load
}

/**
 * Restore the real file system.
 */
unmock.fs = function () {
  if (mockFs) {
    mockFs.restore()
    mockFs = null
  }
}

/**
 * Make the os and cluster modules think there's just one CPU.
 */
mock.cpu = function (options) {
  options = options || {}
  if (typeof options.cpus === 'number') {
    options.cpus = unmock(require('os')).cpus().slice(0, options.cpus)
  }
  if (typeof options.hostname === 'string') {
    options.hostname = mock.fn().returns(options.hostname)
  }
  if (options.fork === false) {
    options.fork = mock.fn()
  }
  var modules = ['os', 'cluster']
  modules.forEach(function (lib) {
    lib = require(lib)
    unmock(lib)
    var mocks = {}
    for (var key in options) {
      if (typeof lib[key] === typeof options[key]) {
        mocks[key] = options[key]
      }
    }
    mock(lib, mocks)
  })
}

/**
 * Unmock the cluster and os modules.
 */
unmock.cpu = function () {
  var modules = ['os', 'cluster']
  modules.forEach(function (lib) {
    unmock(require(lib))
  })
}

// Make references to timers and the real `Date` object before mocking time.
var timers = require('timers')
timers.Date = Date

/**
 * Freeze time to a `Date` constructed with the given `value`.
 */
mock.time = function (value) {
  var date = new timers.Date(value)
  mock.time._CURRENT_TIME = date.getTime()
  mock(timers.Date, {now: MockDate.now})
  global.Date = MockDate
  global.setTimeout = getScheduler(false)
  global.setInterval = getScheduler(true)
  global.clearTimeout = getUnscheduler()
  global.clearInterval = getUnscheduler()
  return mock.time
}

/**
 * Construct a `MockDate` using a `Date` constructor value.
 */
function MockDate (value) {
  // A MockDate constructs an inner date and exposes its methods.
  var innerDate
  // If a value is specified, use it to construct a real date.
  if (arguments.length) {
    innerDate = new timers.Date(value)

  // If time isn't currently mocked, construct a real date for the real time.
  } else if (global.Date === timers.Date) {
    innerDate = new timers.Date()

  // If there's no value and time is mocked, use the current mock time.
  } else {
    innerDate = new timers.Date(mock.time._CURRENT_TIME)
  }
  Object.defineProperty(this, '_INNER_DATE', {
    enumerable: false,
    value: innerDate
  })
}

/**
 * Get the current mock time or real time in milliseconds.
 */
MockDate.now = function () {
  // If time has been unmocked, use the real Date object.
  if (mock.time._CURRENT_TIME === undefined) {
    return realNow()

  // Otherwise, use the mock time value.
  } else {
    return mock.time._CURRENT_TIME
  }
}

// `Date.parse` and `Date.UTC` are not relative to the current time.
MockDate.parse = timers.Date.parse
MockDate.UTC = timers.Date.UTC

// An instance of `MockDate` uses methods from its inner date.
var methods = ['getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds',
  'getMinutes', 'getMonth', 'getSeconds', 'getTime', 'getTimezoneOffset',
  'getUTCDate', 'getUTCDay', 'getUTCFullYear', 'getUTCHours',
  'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds',
  'getYear', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
  'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate',
  'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
  'setUTCMonth', 'setUTCSeconds', 'setYear', 'toDateString', 'toGMTString',
  'toISOString', 'toJSON', 'toLocaleDateString', 'toLocaleString',
  'toLocaleTimeString', 'toString', 'toTimeString', 'toUTCString',
  'valueOf']
  methods.forEach(function (name) {
  MockDate.prototype[name] = function () {
    return this._INNER_DATE[name].apply(this._INNER_DATE, arguments)
  }
})

/**
 * Add time to the frozen value.
 */
mock.time.add = function (time) {
  var p = /(\d+)\s*(s|seconds?)?(m|minutes?)?(h|hours?)?(d|days?)?\b/
  time = '' + time
  time.replace(p, function (match, n, s, m, h, d) {
    mock.time._CURRENT_TIME += +n * (s ? 1e3 : m ? 6e4 : h ? 36e5 : d ? 864e5 : 1)
  })
  runSchedules()
}

/**
 * Set `mock.time` to move forward at a faster or slower speed than
 * real time, based on whether `speed` is greater or less than 1.
 */
mock.time.speed = function (speed) {
  // By default, move ahead a thousand times faster than real time.
  mock.time._SPEED = speed || 1e3
  moveTime()
}

/**
 * If mock time is moving forward, schedule a time check.
 */
function moveTime () {
  if (mock.time._SPEED) {
    // Remember what the real time was before updating.
    mock.time._PREVIOUS_TIME = realNow()
    // Set time to be incremented.
    setTimeout(function () {
      var now = realNow()
      var elapsed = now - mock.time._PREVIOUS_TIME
      if (elapsed) {
        var add = elapsed * mock.time._SPEED
        mock.time.add(add)
      }
      moveTime()
    }, 0)
  }
}

/**
 * Return what `Date.now()` would return if it wasn't mocked.
 */
function realNow () {
  // We don't replace the `Date` constructor, so this is safe from stack overflow.
  return (new timers.Date()).getTime()
}

/**
 * `schedules` are the result of mocked `setTimeout` and `setInterval` calls.
 */
var schedules = []
schedules.id = 0

/**
 * The `getScheduler` returns mocks for `setTimeout` and `setInterval`.
 */
function getScheduler (isInterval) {
  return function (fn, time) {
    schedules.push({
      id: ++schedules.id,
      fn: fn,
      time: Date.now() + time,
      interval: isInterval ? time : false
    })
  }
}

/**
 * The `getUnscheduler` returns mocks for `clearTimeout` and `clearInterval`.
 */
function getUnscheduler () {
  // TODO: Create a map of IDs if the schedules array gets large.
  return function (id) {
    for (var i = 0, l = schedules.length; i < l; i++) {
      var schedule = schedules[i]
      if (schedule.id === id) {
        schedules.splice(i, 1)
        break
      }
    }
  }
}

/**
 * When `mock.time.add` is called, run schedules whose time has come.
 */
function runSchedules () {
  // Sort by descending time order.
  schedules.sort(function (a, b) {
    return b.time - a.time
  })
  // Track the soonest interval run time, in case we're already there.
  var minNewTime = Number.MAX_VALUE
  // Iterate, from the end until we reach the current mock time.
  var i = schedules.length - 1
  var schedule = schedules[i]
  while (schedule && (schedule.time <= mock.time._CURRENT_TIME)) {
    schedule.fn()
    // setTimeout schedules can be deleted.
    if (!schedule.interval) {
      schedules.splice(i, 1)

    // setInterval schedules should schedule the next run.
    } else {
      schedule.time += schedule.interval
      minNewTime = Math.min(minNewTime, schedule.time)
    }
    schedule = schedules[--i]
  }
  // If an interval schedule is in the past, catch it up.
  if (minNewTime <= mock.time._CURRENT_TIME) {
    process.nextTick(runSchedules)
  }
}

/**
 * Restore the real `Date` object and time-related functions.
 */
unmock.time = function () {
  delete mock.time._CURRENT_TIME
  delete mock.time._SPEED
  global.Date = timers.Date
  global.setTimeout = timers.setTimeout
  global.setInterval = timers.setInterval
  global.clearTimeout = timers.clearTimeout
  global.clearInterval = timers.clearInterval
  schedules.length = 0
  unmock(timers.Date, 'now')
}


/**
 * Expose `mock-fs` methods as exam/lib/mock methods.a
 */
var methods = ['directory', 'file', 'symlink']
methods.forEach(function (method) {
  mock[method] = function () {
    var mockFs = require('mock-fs')
    return mockFs[method].apply(mockFs, arguments)
  }
})
