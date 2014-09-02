/**
 * This mock script is an extremely simple way to change several of an object's
 * properties, then quickly change them back.
 *
 */

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
  var mocked = object._EXAM_MOCKED;
  // If the object has mocked values for mocked properties, restore them.
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
 * Simple mock function: Ignore.
 */
mock.ignore = function () {
  return function () {};
};

/**
 * Simple mock function: Call counter.
 */
mock.count = function () {
  function fn(data) {
    fn.value++;
  }
  fn.value = 0;
  return fn;
};

/**
 * Simple mock function: string concatenator.
 */
mock.concat = function (delimiter) {
  delimiter = delimiter || '';
  function fn(data) {
    fn.value += (fn.value ? delimiter : '') + data;
  }
  fn.value = '';
  return fn;
};

/**
 * Simple mock function: Argument pusher.
 */
mock.args = function (index) {
  function fn(data) {
    fn.value.push(isNaN(index) ? arguments : arguments[index]);
  }
  fn.value = [];
  return fn;
};

/**
 * Simple mock function: Ignore.
 */
mock.ignore = function () {
  return function () {};
};
