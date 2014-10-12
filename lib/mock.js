var fs = require('fs');

/**
 * Keep track of mocked objects so they can all be unmocked.
 */
var mockedObjects = [];

/**
 * Allow `mock-fs` to be loaded lazily and referenced.
 */
var mockFs;

/**
 * Keep track of a few real things.
 */
var real = {
  Date: Date,
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearTimeout: clearTimeout,
  clearInterval: clearInterval
};

/**
 * Decorate an object with mocked properties.
 */
global.mock = module.exports = function mock(object, mockObject) {
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

/**
 * Restore mocked properties to their mocked values.
 */
global.unmock = function unmock(object, keys) {
  // If called with no arguments, unmock all objects that have been mocked.
  if (!arguments.length) {
    for (var index = 0, length = mockedObjects.length; index < length; index++) {
      unmock(mockedObjects[index]);
    }
    mockedObjects.length = 0;
    return;
  }
  // If it's a single key, make it an array.
  if (typeof keys == 'string') {
    keys = [keys];
  }
  // If the object has original values for mocked properties, restore them.
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
    // If we weren't deleting specific keys, we no longer need the originals.
    if (!keys) {
      delete object._EXAM_MOCKED_ORIGINALS;
    }
  }
};


/**
 * Decorate a mock function with chainable methods.
 */
function decorateFn(fn, args) {
  fn.returns = function (value) {
    fn._returns = value;
    return fn;
  };
  return fn;
}

/**
 * Finish the execution of a mock function.
 */
function finishFn(fn) {
  return fn._returns;
}

/**
 * Simple mock function: Ignore.
 */
mock.ignore = function () {
  var fn = function () {
    return finishFn(fn);
  };
  return decorateFn(fn);
};

/**
 * Simple mock function: Call counter.
 */
mock.count = function () {
  function fn(data) {
    fn.value++;
    return finishFn(fn);
  }
  fn.value = 0;
  return decorateFn(fn);
};

/**
 * Simple mock function: Argument setter.
 */
mock.set = function (index) {
  function fn(data) {
    fn.value = isNaN(index) ? arguments : arguments[index];
    return finishFn(fn);
  }
  fn.value = [];
  return decorateFn(fn);
};

/**
 * Simple mock function: Argument pusher.
 */
mock.args = function (index) {
  function fn(data) {
    fn.value.push(isNaN(index) ? arguments : arguments[index]);
    return finishFn(fn);
  }
  fn.value = [];
  return decorateFn(fn);
};

/**
 * Simple mock function: String concatenator.
 */
mock.concat = function (delimiter) {
  delimiter = delimiter || '';
  function fn(data) {
    fn.value += (fn.value ? delimiter : '') + data;
    return finishFn(fn);
  }
  fn.value = '';
  return decorateFn(fn);
};

/**
 * Simple mock function: Error thrower.
 */
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

/**
 * Load `mock-fs` and create a temporary file system.
 */
mock.fs = function (config, newFs) {
  mockFs = require('mock-fs');
  var fs;
  if (newFs) {
    fs = mockFs.fs(config);
    delete mockFs;
  }
  else {
    mockFs(config);
    fs = require('fs');
  }
  return fs;
};

/**
 * Load an array of paths, and return an object for `mock.fs`.
 */
mock.fs.load = function (paths) {
  var load = {};
  paths.forEach(function (path) {
    load[path] = fs.readFileSync(path);
  });
  return load;
};

/**
 * Restore the real file system.
 */
unmock.fs = function () {
  if (mockFs) {
    mockFs.restore();
    mockFs = null;
  }
};


/**
 * Freeze time to a `Date` constructed with the given `value`.
 */
mock.time = function (value) {
  var date = new real.Date(value);
  mock.time.T = date.getTime();
  mock(real.Date, {now: MockDate.now});
  mock(global, {
    Date: MockDate,
    setTimeout: scheduler(false),
    setInterval: scheduler(true),
    clearTimeout: unscheduler(),
    clearInterval: unscheduler()
  });
  return mock.time;
};

/**
 * Construct a `MockDate` using a `Date` constructor value.
 */
function MockDate(value) {
  var date;
  // If no value is specified
  if (arguments.length) {
    date = new real.Date(value);
  }
  else if (mock.time.T === undefined) {
    date = new real.Date();
  }
  else {
    date = new real.Date(mock.time.T);
  }
  Object.defineProperty(this, 'D', {
    enumerable: false,
    value: date
  });
}

/**
 * Get the current mock time or real time in milliseconds.
 */
MockDate.now = function () {
  // If time has been unmocked, use the real Date object.
  if (mock.time.T === undefined) {
    return new real.Date.now();
  }
  // Otherwise, use the mock time value.
  else {
    return mock.time.T;
  }
};

// `Date.parse` and `Date.UTC` are not relative to the current time.
MockDate.parse = real.Date.parse;
MockDate.UTC = real.Date.UTC;

// An instance of `MockDate` uses methods from its inner date `D`.
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
    return this.D[name].apply(this.D, arguments);
  };
});

/**
 * Add time to the frozen value.
 */
mock.time.add = function (time) {
  var p = /(\d+)\s*(s|seconds?)?(m|minutes?)?(h|hours?)?(d|days?)?\b/;
  ('' + time).replace(p, function (match, n, s, m, h, d) {
    mock.time.T += +n * (s ? 1e3 : m ? 6e4 : h ? 36e5 : d ? 864e5 : 1);
  });
  checkSchedules();
};

/**
 * Set `mock.time` to move forward R times faster than real time.
 */
mock.time.speed = function (R) {
  // By default, move ahead a thousand times faster than real time.
  mock.time.R = R || 1e3;
  // If the time was moving ahead at a given rate, cancel it.
  real.clearInterval(mock.time.I);
  // Remember real time at the point of the last update.
  mock.time.L = realNow();
  mock.time.I = real.setInterval(function () {
    mock.time.add(TODO);
  });
};

function realNow() {
  return (new real.Date()).getTime();
}

/**
 * When time is speeding ahead, add M * R to T once every M milliseconds.
 */
mock.time.M = 1;

/**
 * `schedules` are the result of call to `setTimeout` or `setInterval`.
 */
var schedules = [];
schedules.id = 0;

/**
 * Schedules are sorted by the time their function should run.
 */
schedules.sort = function () {
  Array.prototype.sort.call(schedules, function (a, b) {
    return b.time - a.time;
  });
  console.log(schedules);
};

/**
 * The `scheduler` returns mocks for `setTimeout` and `setInterval`.
 */
function scheduler(isInterval) {
  return function (fn, time) {
    schedules.push({
      id: ++schedules.id,
      fn: fn,
      time: Date.now() + time,
      interval: isInterval ? time : false
    });
  };
}

/**
 * The `unscheduler` returns mocks for `clearTimeout` and `clearInterval`.
 */
function unscheduler() {
  return function (id) {
    for (var i = schedules.length - 1; i >= 0; i--) {
      var schedule = schedules[i];
      if (schedule.id == id) {
        delete schedules[i];
        break;
      }
    }
  };
}

/**
 * When `mock.time.add` is called, run schedules whose time has come.
 */
function runSchedules() {
  var i = 0;
  var intervals
  var schedule = schedules[i];
  while (schedule.time <= mock.time.T) {
    schedule.fn();
    if (schedule.interval === false) {
      delete schedule[i];
    }
    else {
      schedule.time += schedule.interval;
    }
    schedule = schedules[++i] || null;
  }
}

/**
 * Restore the real `Date` object.
 */
unmock.time = function () {
  global.Date = real.Date;
  global.setTimeout = real.setTimeout;
  global.setInterval = real.setInterval;
  delete mock.time.T;
  unmock(real.Date, 'now');
};


/**
 * Expose `mock-fs` methods as exam/lib/mock methods.
 */
['directory', 'file', 'symlink'].forEach(function (method) {
  mock[method] = function() {
    var mockFs = require('mock-fs');
    return mockFs[method].apply(mockFs, arguments);
  };
});
