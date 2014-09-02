var AssertionError = require('assert').AssertionError;
var currentTest = null;

function is(actual, expected) {
  var fn = (actual === expected) ? is.pass : is.fail;
  var op = '===';
  return fn([deep(actual), op, deep(expected)], is, actual, expected);
}

global.is = module.exports = is.is = is;

function ignoreAndChain() {
  return is;
}

// For other test runners, successful assertions just continue.
is.pass = ignoreAndChain;

// In the "exam" runner, successful assertions can push a message.
is.enableContinuation = function (enable) {
  if (enable || (enable === undefined)) {
    is.pass = function (statement) {
      // Push the positive result in.
      if (currentTest) {
        currentTest.results.push(statement);
      }
      return is;
    };
  }
  else {
    is.pass = ignoreAndChain;
  }
  return is;
};

// In the "exam" runner, the current test accepts results.
is.setCurrentTest = function (test) {
  currentTest = test;
  is.currentTest = test;
  return is;
};

// TODO: Diff
is.fail = function (pieces, startFunc, actual, expected, operator) {
  if (!operator) {
    operator = expected;
    expected = null;
  }
  var err = new AssertionError({
    actual: actual,
    expected: expected,
    message: pieces ? pieces.join(' ') : 'fail',
    operator: operator,
    stackStartFunction: startFunc || is.fail
  });
  err.trace = err.stack.replace(/(\/exam\/lib\/run\.js\S+)\n[\s\S]+$/, '$1');
  // If "exam" is the runner, we keep an array of assertion results.
  if (currentTest) {
    // Track the first error a test has.
    currentTest.error = currentTest.error || err;
    // Push this error and continue.
    currentTest.results.push(err);
  }
  // For other test runners, or if we couldn't find the calling test, throw.
  else {
    throw err;
  }
  return is;
};

/**
 * Comparisons
 */

is.not = function (actual, expected) {
  var fn = (actual !== expected) ? is.pass : is.fail;
  var op = '!==';
  return fn([deep(actual), op, deep(expected)], is.not, actual, expected);
};

is.equal = function (actual, expected) {
  var fn = (actual == expected) ? is.pass : is.fail;
  var op = '==';
  return fn([deep(actual), op, deep(expected)], is.equal, actual, expected);
};

is.notEqual = function (actual, expected) {
  var fn = (actual != expected) ? is.pass : is.fail;
  var op = '!=';
  return fn([deep(actual), op, deep(expected)], is.notEqual, actual, expected);
};

is.same = is.deepEqual = function (actual, expected) {
  var fn = (deep(actual) == deep(expected)) ? is.pass : is.fail;
  var op = 'same';
  return fn([deep(actual), op, deep(expected)], is.same, actual, expected);
};

is.notSame = is.notDeepEqual = function (actual, expected) {
  var fn = (deep(actual) != deep(expected)) ? is.pass : is.fail;
  var op = 'notSame';
  return fn([deep(actual), op, deep(expected)], is.notSame, actual, expected);
};

is.greater = function (first, second) {
  var fn = (first > second) ? is.pass : is.fail;
  var op = '>';
  return fn([deep(first), op, deep(second)], is.greater, first, second);
};

is.less = function (first, second) {
  var fn = (first < second) ? is.pass : is.fail;
  var op = '<';
  return fn([deep(first), op, deep(second)], is.less, first, second);
};

is.greaterOrEqual = function (first, second) {
  var fn = (first >= second) ? is.pass : is.fail;
  var op = '>=';
  return fn([deep(first), op, deep(second)], is.greaterOrEqual, first, second);
};

is.lessOrEqual = function (first, second) {
  var fn = (first <= second) ? is.pass : is.fail;
  var op = '<=';
  return fn([deep(first), op, deep(second)], is.lessOrEqual, first, second);
};

/**
 * Types
 */

is.type = function (value, type) {
  var fn = (typeof value == type) ? is.pass : is.fail;
  var op = 'is a ' + type;
  return fn([deep(value), op, type], is.type, value, type);
};

is.notType = function (value, type) {
  var fn = (typeof value != type) ? is.pass : is.fail;
  var op = 'is a ' + type;
  return fn([deep(value), op, type], is.notType, value, type);
};

is.undefined = function (value) {
  var fn = (typeof value == 'undefined') ? is.pass : is.fail;
  var op = 'is undefined';
  return fn([deep(value), op], is.undefined, value);
};

is.notUndefined = is.defined = function (value) {
  var fn = (typeof value != 'undefined') ? is.pass : is.fail;
  var op = 'is defined';
  return fn([deep(value), op], is.defined, value);
};

is.boolean = function (value) {
  var fn = (typeof value == 'boolean' || value instanceof Boolean) ? is.pass : is.fail;
  var op = 'is a boolean';
  return fn([deep(value), op], is.boolean, value);
};

is.notBoolean = function (value) {
  var fn = (typeof value != 'boolean' && !(value instanceof Boolean)) ? is.pass : is.fail;
  var op = 'is not a boolean';
  return fn([deep(value), op], is.notBoolean, value);
};

is.number = function (value) {
  var fn = (typeof value == 'number' || value instanceof Number) ? is.pass : is.fail;
  var op = 'is a number';
  return fn([deep(value), op], is.number, value);
};

is.notNumber = function (value) {
  var fn = (typeof value != 'number' && !(value instanceof Number)) ? is.pass : is.fail;
  var op = 'is not a number';
  return fn([deep(value), op], is.notNumber, value);
};

is.string = function (value) {
  var fn = (typeof value == 'string' || value instanceof String) ? is.pass : is.fail;
  var op = 'is a string';
  return fn([deep(value), op], is.string, value);
};

is.notString = function (value) {
  var fn = (typeof value != 'string' && !(value instanceof String)) ? is.pass : is.fail;
  var op = 'is not a string';
  return fn([deep(value), op], is.notString, value);
};

is.function = function (value) {
  var fn = (typeof value == 'function' || value instanceof Function) ? is.pass : is.fail;
  var op = 'is a function';
  return fn([deep(value), op], is.function, value);
};

is.notFunction = function (value) {
  var fn = (typeof value != 'function' && !(value instanceof Function)) ? is.pass : is.fail;
  var op = 'is not a function';
  return fn([deep(value), op], is.notFunction, value);
};

is.object = function (value) {
  var fn = (typeof value == 'object') ? is.pass : is.fail;
  var op = 'is an object';
  return fn([deep(value), op], is.object, value);
};

is.notObject = function (value) {
  var fn = (typeof value != 'object') ? is.pass : is.fail;
  var op = 'is not an object';
  return fn([deep(value), op], is.notObject, value);
};

/**
 * Instances
 */

is.instanceOf = function (value, expectedClass) {
  var fn = (typeof expectedClass == 'function' && value instanceof expectedClass) ? is.pass : is.fail;
  var op = 'is an instance of';
  return fn([deep(value), op, expectedClass.name], is.instanceOf, value);
};

is.notInstanceOf = function (value, expectedClass) {
  var fn = !(typeof expectedClass == 'function' && value instanceof expectedClass) ? is.pass : is.fail;
  var op = 'is not an instance of';
  return fn([deep(value), op, expectedClass.name], is.notInstanceOf, value);
};

is.array = function (value) {
  var fn = (value instanceof Array) ? is.pass : is.fail;
  var op = 'is an array';
  return fn([deep(value), op], is.array, value);
};

is.notArray = function (value) {
  var fn = !(value instanceof Array) ? is.pass : is.fail;
  var op = 'is not an array';
  return fn([deep(value), op], is.notArray, value);
};

is.date = function (value) {
  var fn = (value instanceof Date) ? is.pass : is.fail;
  var op = 'is a date';
  return fn([deep(value), op], is.date, value);
};

is.notDate = function (value) {
  var fn = !(value instanceof Date) ? is.pass : is.fail;
  var op = 'is not a date';
  return fn([deep(value), op], is.notDate, value);
};

is.error = function (value) {
  var fn = (value instanceof Error) ? is.pass : is.fail;
  var op = 'is an error';
  return fn([deep(value), op], is.error, value);
};

is.notError = function (value) {
  var fn = !(value instanceof Error) ? is.pass : is.fail;
  var op = 'is not an error';
  return fn([deep(value), op], is.notError, value);
};

is.regExp = function (value) {
  var fn = (value instanceof RegExp) ? is.pass : is.fail;
  var op = 'is an regExp';
  return fn([deep(value), op], is.regExp, value);
};

is.notRegExp = function (value) {
  var fn = !(value instanceof RegExp) ? is.pass : is.fail;
  var op = 'is not an regExp';
  return fn([deep(value), op], is.notRegExp, value);
};

/**
 * Values
 */

is.nan = function (value) {
  var fn = isNaN(value) ? is.pass : is.fail;
  var op = 'is NaN';
  return fn([deep(value), op], is.nan, value);
};

is.notNan = function (value) {
  var fn = !isNaN(value) ? is.pass : is.fail;
  var op = 'is not NaN';
  return fn([deep(value), op], is.notNan, value);
};

is.null = function (value) {
  var fn = (value === null) ? is.pass : is.fail;
  var op = 'is null';
  return fn([deep(value), op], is.null, value);
};

is.notNull = function (value) {
  var fn = (value !== null) ? is.pass : is.fail;
  var op = 'is not null';
  return fn([deep(value), op], is.notNull, value);
};

is.true = function (value) {
  var fn = (value === true) ? is.pass : is.fail;
  var op = 'is true';
  return fn([deep(value), op], is.true, value);
};

is.notTrue = function (value) {
  var fn = (value !== true) ? is.pass : is.fail;
  var op = 'is not true';
  return fn([deep(value), op], is.true, value);
};

is.false = function (value) {
  var fn = (value === false) ? is.pass : is.fail;
  var op = 'is false';
  return fn([deep(value), op], is.false, value);
};

is.notFalse = function (value) {
  var fn = (value !== false) ? is.pass : is.fail;
  var op = 'is not false';
  return fn([deep(value), op], is.false, value);
};

is.truthy = function (value) {
  var fn = value ? is.pass : is.fail;
  var op = 'is truthy';
  return fn([deep(value), op], is.truthy, value);
};

is.falsy = function (value) {
  var fn = !value ? is.pass : is.fail;
  var op = 'is falsy';
  return fn([deep(value), op], is.falsy, value);
};

/**
 * Searches
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
  return fn([deep(search), op, deep(value)], is.in, search, value);
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
  return fn([deep(search), op, deep(value)], is.notIn, search, value);
};

is.lengthOf = function (value, length) {
  var fn = (value && (value.length === length)) ? is.pass : is.fail;
  var op = 'has a length of';
  return fn([deep(value), op, length], is.lengthOf, value, length);
};

is.notLengthOf = function (value, length) {
  var fn = (!value || (value.length !== length)) ? is.pass : is.fail;
  var op = 'does not have a length of';
  return fn([deep(value), op, length], is.notLengthOf, value, length);
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
  return fn([deep(array), op, deep(name)], is.arrayOf, array, expected);
};

is.notArrayOf = function (array, expected) {
  var ex = expected || 'undefined';
  var name = ex.name || ex;
  var fn = (expected && !isArrayOf(array, ex)) ? is.pass : is.fail;
  var op = 'is not an array of ' + ex + 's';
  return fn([deep(array), op, deep(name)], is.notArrayOf, array, expected);
};

function deep(data, stack) {
  if (data === null) {
    data = 'null';
    if (stack) {
      data = data;
    }
  }
  else if (typeof data == 'function') {
    data = data.toString();
  }
  else if (data instanceof Date) {
    data = '(new Date(' + data.getTime() + '))';
  }
  else if (typeof data == 'object') {
    stack = stack || [];
    var circular = 0;
    stack.forEach(function (item, index) {
      if ((item == data) && !circular) {
        circular = -(index + 1);
      }
    });
    if (circular) {
      return '{_CIRCULAR:' + circular + '}';
    }
    stack.push(data);
    var parts = [];
    var text;
    var isArray = (data instanceof Array);
    if (stack.length > 10) {
      data = (isArray ? '[Array]' : '[Object]');
    }
    else {
      if (isArray) {
        data.forEach(function (value) {
          text = deep(value, stack);
          parts.push(text);
        });
      }
      else {
        for (var key in data) {
          var value = data[key];
          text = key + ':' + deep(value, stack);
          parts.push(text);
        }
      }
      stack.pop();
      data = parts.join(',');
      if (isArray) {
        data = '[' + data + ']';
      }
      else {
        data = '{' + data + '}';
      }
    }
  }
  else {
    if (typeof data == 'string') {
      data = '"' + data.replace(/"/g, '\\"') + '"';
    }
    else {
      data = '' + data;
    }
  }
  return data;
}

Object.defineProperty(is, 'deep', {
  enumerable: false,
  value: deep
});
