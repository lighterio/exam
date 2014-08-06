var AssertionError = require('assert').AssertionError;
var currentTest = null;

function is(actual, expected) {
  var fn = (actual == expected) ? is.pass : is.fail;
  return fn(deep(actual) + ' == ' + deep(expected), is, actual, expected, '==');
}

global.is = module.exports = is.is = is;

// For other test runners, successful assertions just continue.
is.pass = function () {
  return is;
};

// In the "exam" runner, successful assertions push a message.
is.enableContinuation = function enableContinuation() {
  is.pass = function (statement) {
    // Push the positive result in.
    if (currentTest) {
      currentTest.results.push(statement);
    }
    return is;
  };
};

// In the "exam" runner, the current test accepts results.
is.setCurrentTest = function setCurrentTest(test) {
  currentTest = test;
};

// TODO: Diff
is.fail = function (statement, startFunc, actual, expected, operator) {
  if (!operator) {
    operator = expected;
    expected = null;
  }
  var err = (statement instanceof Error) ?
    statement :
    new AssertionError({
      actual: actual,
      expected: expected,
      message: statement || 'fail',
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

is.not = function (actual, expected) {
  var fn = (actual != expected) ? is.pass : is.fail;
  return fn(deep(actual) + ' != ' + deep(expected), is.not, actual, expected, '!=');
};

is.tis = function (actual, expected) {
  var fn = (actual === expected) ? is.pass : is.fail;
  return fn(deep(actual) + ' === ' + deep(expected), is.tis, actual, expected, '===');
};

is.tisNot = function (actual, expected) {
  var fn = (actual !== expected) ? is.pass : is.fail;
  return fn(deep(actual) + ' !== ' + deep(expected), is.tisNot, actual, expected, '!==');
};

is.same = function (actual, expected) {
  var fn = (deep(actual) == deep(expected)) ? is.pass : is.fail;
  return fn(deep(actual) + ' is deeply equal to ' + deep(expected), is.same, actual, expected, 'same');
};

is.notSame = function (actual, expected) {
  var fn = (deep(actual) != deep(expected)) ? is.pass : is.fail;
  return fn(deep(actual) + ' is not deeply equal to ' + deep(expected), is.notSame, actual, expected, 'notSame');
};

is.greater = function (actual, compareTo) {
  var fn = (actual > compareTo) ? is.pass : is.fail;
  return fn(deep(actual) + ' > ' + deep(compareTo), is.greater, actual, compareTo, '>');
};

is.less = function (actual, compareTo) {
  var fn = (actual < compareTo) ? is.pass : is.fail;
  return fn(deep(actual) + ' < ' + deep(expected), is.less, actual, compareTo, '<');
};

is.greaterOrEqual = function (actual, compareTo) {
  var fn = (actual >= compareTo) ? is.pass : is.fail;
  return fn(deep(actual) + ' >= ' + deep(compareTo), is.greaterOrEqual, actual, compareTo, '>=');
};

is.lessOrEqual = function (actual, compareTo) {
  var fn = (actual <= compareTo) ? is.pass : is.fail;
  return fn(deep(actual) + ' <= ' + deep(compareTo), is.lessOrEqual, actual, compareTo, '<=');
};

is.truthy = function (value) {
  var fn = value ? is.pass : is.fail;
  return fn(deep(value) + ' is truthy', is.truthy, value, 'is truthy');
};

is.falsy = function (value) {
  var fn = !value ? is.pass : is.fail;
  return fn(deep(value) + ' is falsy', is.falsy, value, 'is falsy');
};

is.true = function (value) {
  var fn = (value === true) ? is.pass : is.fail;
  return fn(deep(value) + ' is true', is.true, value, 'is true');
};

is.false = function (value) {
  var fn = (value === false) ? is.pass : is.fail;
  return fn(deep(value) + ' is false', is.false, value, 'is false');
};

is.null = function (value) {
  var fn = (value === null) ? is.pass : is.fail;
  return fn(deep(value) + ' is null', is.null, value, 'is null');
};

is.notNull = function (value) {
  var fn = (value !== null) ? is.pass : is.fail;
  return fn(deep(value) + ' is not null', is.notNull, value, 'is not null');
};

is.nan = function (value) {
  var fn = isNaN(value) ? is.pass : is.fail;
  return fn(deep(value) + ' is NaN', is.nan, value, 'is NaN');
};

is.notNan = function (value) {
  var fn = !isNaN(value) ? is.pass : is.fail;
  return fn(deep(value) + ' is not NaN', is.notNan, value, 'is not NaN');
};

is.type = function (value, type) {
  var fn = (typeof value == type) ? is.pass : is.fail;
  return fn(deep(value) + ' is a ' + type, is.type, value, type, 'is a ' + type);
};

is.notType = function (value, type) {
  var fn = (typeof value != type) ? is.pass : is.fail;
  return fn(deep(value) + ' is a ' + type, is.notType, value, type, 'is a ' + type);
};

is.undefined = function (value) {
  var fn = (typeof value == 'undefined') ? is.pass : is.fail;
  return fn(deep(value) + ' is undefined', is.undefined, value, 'is undefined');
};

is.defined = function (value) {
  var fn = (typeof value != 'undefined') ? is.pass : is.fail;
  return fn(deep(value) + ' is defined', is.defined, value, 'is defined');
};

is.boolean = function (value) {
  var fn = (typeof value == 'boolean') ? is.pass : is.fail;
  return fn(deep(value) + ' is a boolean', is.boolean, value, 'is a boolean');
};

is.notBoolean = function (value) {
  var fn = (typeof value != 'boolean') ? is.pass : is.fail;
  return fn(deep(value) + ' is not a boolean', is.notBoolean, value, 'is not a boolean');
};

is.number = function (value) {
  var fn = (typeof value == 'number') ? is.pass : is.fail;
  return fn(deep(value) + ' is a number', is.number, value, 'is a number');
};

is.notNumber = function (value) {
  var fn = (typeof value != 'number') ? is.pass : is.fail;
  return fn(deep(value) + ' is not a number', is.notNumber, value, 'is not a number');
};

is.string = function (value) {
  var fn = (typeof value == 'string') ? is.pass : is.fail;
  return fn(deep(value) + ' is a string', is.string, value, 'is a string');
};

is.notString = function (value) {
  var fn = (typeof value != 'string') ? is.pass : is.fail;
  return fn(deep(value) + ' is not a string', is.notString, value, 'is not a string');
};

is.function = function (value) {
  var fn = (typeof value == 'function') ? is.pass : is.fail;
  return fn(deep(value) + ' is a function', is.function, value, 'is a function');
};

is.notFunction = function (value) {
  var fn = (typeof value != 'function') ? is.pass : is.fail;
  return fn(deep(value) + ' is not a function', is.notFunction, value, 'is not a function');
};

is.object = function (value) {
  var fn = (typeof value == 'object') ? is.pass : is.fail;
  return fn(deep(value) + ' is an object', is.object, value, 'is an object');
};

is.notObject = function (value) {
  var fn = (typeof value != 'object') ? is.pass : is.fail;
  return fn(deep(value) + ' is not an object', is.notObject, value, 'is not an object');
};

is.instance = function (value, expectedClass) {
  var fn = (value instanceof expectedClass) ? is.pass : is.fail;
  return fn(deep(value) + ' is an instance of ' + expectedClass.name, is.instance, value, 'is an instance of');
};

is.notInstance = function (value, expectedClass) {
  var fn = !(value instanceof expectedClass) ? is.pass : is.fail;
  return fn(deep(value) + ' is not an instance of ' + expectedClass.name, is.notInstance, value, 'is not an instance of');
};

is.array = function (value) {
  var fn = (value instanceof Array) ? is.pass : is.fail;
  return fn(deep(value) + ' is an array', is.array, value, 'is an array');
};

is.notArray = function (value) {
  var fn = !(value instanceof Array) ? is.pass : is.fail;
  return fn(deep(value) + ' is not an array', is.notArray, value, 'is not an array');
};

is.date = function (value) {
  var fn = (value instanceof Date) ? is.pass : is.fail;
  return fn(deep(value) + ' is a date', is.date, value, 'is a date');
};

is.notDate = function (value) {
  var fn = !(value instanceof Date) ? is.pass : is.fail;
  return fn(deep(value) + ' is not a date', is.notDate, value, 'is not a date');
};

is.error = function (value) {
  var fn = (value instanceof Error) ? is.pass : is.fail;
  return fn(deep(value) + ' is an error', is.error, value, 'is an error');
};

is.notError = function (value) {
  var fn = !(value instanceof Error) ? is.pass : is.fail;
  return fn(deep(value) + ' is not an error', is.notError, value, 'is not an error');
};

is.in = function (needle, haystack) {
  var ok = (typeof haystack == 'string');
  if (ok) {
    if (needle instanceof RegExp) {
      ok = needle.test(haystack);
    }
    else {
      ok = haystack.indexOf(needle) > -1;
    }
  }
  var fn = ok ? is.pass : is.fail;
  return fn(deep(needle) + ' is in' + deep(haystack), is.in, needle, haystack, 'is in');
};

is.notIn = function (needle, haystack) {
  var ok = (typeof haystack == 'string');
  if (ok) {
    if (needle instanceof RegExp) {
      ok = needle.test(haystack);
    }
    else {
      ok = haystack.indexOf(needle) > -1;
    }
  }
  var fn = !ok ? is.pass : is.fail;
  return fn(deep(needle) + ' is in' + deep(haystack), is.notIn, needle, haystack, 'is not in');
};

is.lengthOf = function (value, length) {
  var fn = (value && (value.length == length)) ? is.pass : is.fail;
  return fn(deep(value) + ' has a length of ' + length, is.lengthOf, value, length, 'has a length of');
};

is.notLengthOf = function (value, length) {
  var fn = (value && (value.length != length)) ? is.pass : is.fail;
  return fn(deep(value) + ' does not have a length of ' + length, is.notLengthOf, value, length, 'does not have a length of');
};

is.arrayOf = function (array, expected) {
  var ok = (array instanceof Array);
  if (ok) {
    var isString = (typeof expected == 'string');
    array.forEach(function (item) {
      ok = ok && (isString ? (typeof item == expected) : (item instanceof expected));
    });
  }
  var name = expected.name || expected;
  var fn = ok ? is.pass : is.fail;
  return fn(deep(value) + ' is an array of ' + name, is.arrayOf, value, 'is an array of ' + name);
};

is.notArrayOf = function (array, expected) {
  var ok = (array instanceof Array);
  if (ok) {
    var isString = (typeof expected == 'string');
    array.forEach(function (item) {
      ok = ok && (isString ? (typeof item == expected) : (item instanceof expected));
    });
  }
  var name = expected.name || expected;
  var fn = !ok ? is.pass : is.fail;
  return fn(deep(value) + ' is an array of ' + name, is.arrayOf, value, 'is an array of ' + name);
};

var jsonSpace = '  ';

var reserved = /^(break|case|catch|continue|debugger|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with)$/;

function deep(data, stack, space) {
  var spacing = '';
  if (space === true) {
    spacing = jsonSpace;
  }
  if (data === null) {
    data = 'null';
    if (stack) {
      data = data;
    }
  }
  else if (typeof data == 'function') {
    if (stack) {
      data = '[Function' + (data.name ? ': ' + data.name : '') + ']';
      data = data;
    }
    else {
      data = data.toString();
      if (!spacing) {
        data = data.replace(/^function \(/, 'function(');
      }
    }
  }
  else if (data instanceof Date) {
    data = data.toUTCString();
    if (stack) {
      data = '[Date: ' + data + ']';
    }
  }
  else if (typeof data == 'object') {
    stack = stack || [];
    space = space || '';
    var indent = space + (spacing || '');
    var colon = (spacing ? ': ' : ':');
    var circular = 0;
    stack.forEach(function (item, index) {
      if ((item == data) && !circular) {
        circular = -(index + 1);
      }
    });
    if (circular) {
      return '[Circular: ' + circular + ']';
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
          text = deep(value, stack, indent);
          parts.push(text);
        });
      }
      else {
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            var value = data[key];
            if (reserved.test(key)) {
              key = '"' + key + '"';
            }
            text = key + colon + deep(value, stack, indent);
            parts.push(text);
          }
        }
      }
      stack.pop();
      if (spacing) {
        data = parts.join(', ');
      }
      else {
        data = parts.join(',');
      }
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
