/**
 * Exam mock functions are simple utilities for changing several of an object's
 * properties, then changing them back later.
 *
 */

/**
 *
 */
var mocks = [];

/**
 * Decorate an object with mocked properties.
 */
global.mock = module.exports = function mock(object, mockObject) {
  var mocked = object._EXAM_MOCKED;
  if (!mocked) {
    mocked = [{}, {}];
    Object.defineProperty(object, '_EXAM_MOCKED', {
      enumerable: false,
      value: mocked
    });
  }
  for (var name in mockObject) {
    var index = object.hasOwnProperty(name) ? 1 : 0;
    if (typeof mocked[index][name] == 'undefined') {
      mocked[index][name] = object[name];
    }
    object[name] = mockObject[name];
  }
  return object;
};

/**
 * Restore mocked properties to their mocked values.
 */
global.unmock = function unmock(object, mockFields) {
  // If this object is the file system, call `mock-fs` restore.
  if (object == require('fs')) {
    require('mock-fs').restore();
  }
  // If the object has original values for mocked properties, restore them.
  var mocked = object._EXAM_MOCKED;
  if (mocked) {
    for (var index = 0; index < 2; index++) {
      var originals = mocked[index];
      for (var name in originals) {
        if (index) {
          object[name] = originals[name];
        }
        else {
          delete object[name];
        }
      }
    }
    delete object._EXAM_MOCKED;
  }
};

/**
 * Set unmock to be called automagically after a function.
 */
unmock.after = function (fn) {
  fn._EXAM_UNMOCK = true;
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
  var mockFs = require('mock-fs');
  if (newFs) {
    return mockFs.fs(config);
  }
  else {
    mockFs(config);
    return require('fs');
  }
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
