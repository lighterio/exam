// Throw assertion errors, like any well-behaving assertion library.
var AssertionError = require('assert').AssertionError;

function is(actual, expected) {
  var fn = (actual === expected) ? is.pass : is.fail;
  var op = '===';
  return fn([js(actual), op, js(expected)], is, actual, expected);
}

// Expose `is` globally, and create its alias, `is.is`.
global.is = module.exports = is.is = is;

// Use a `stringify` method that generates non-strict JSON.
require('./common/scriptify');
var js = JSON.scriptify;
Object.defineProperty(is, 'stringify', {
  enumerable: false,
  value: js
});

/**
 * When a test succeeds in continuing mode, record the positive result.
 */
is.pass = function (pieces) {
  if (is.emit) {
    var message = (pieces instanceof Array) ? pieces.join(' ') : (pieces || 'pass');
    is.emit('result', message);
  }
  return is;
};

/**
 * When a test fails, record or throw an `AssertionError`.
 */
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
  // If there's an `emit` method, emit successes and failures to it.
  if (is.emit) {
    is.emit('result', error);
  }
  // Otherwise, throw.
  else {
    throw error;
  }
  return is;
};

/**
 * Comparisons.
 */

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

/**
 * Types.
 */

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

/**
 * Instances.
 */

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

/**
 * Values.
 */

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

/**
 * Searches.
 */

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
  var op = 'is in';
  return fn([js(search), op, js(value)], is.in, search, value);
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
  var op = 'is not in';
  return fn([js(search), op, js(value)], is.notIn, search, value);
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

