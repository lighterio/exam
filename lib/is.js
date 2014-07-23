var AssertionError = require('assert').AssertionError;

function is(actual, expected) {
  var fn = (actual != expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' == ' + deep(expected), is, actual, expected, '==');
  }
  return is;
}

global.is = module.exports = is.is = is;

Object.defineProperty(is, '_EXAM_TEST', {
  enumerable: false,
  value: null
});

// When running with something other than "exam", succeeding just means not
// throwing an AssertionError.
var succeed = null;

// When "exam" is the runner, assertions can push errors and continue.
is.enableContinuation = function enableContinuation() {
  succeed = is.succeed = function succeed(statement) {
    // Push the positive result in.
    var test = is._EXAM_TEST;
    if (test) {
      test.results.push(statement);
    }
  };
};

// TODO: Diff
function fail(statement, startFunc, actual, expected, operator) {
  var err = new AssertionError({
    actual: actual,
    expected: expected,
    message: statement || 'fail',
    operator: operator || expected,
    stackStartFunction: startFunc || fail
  });
  err.trace = err.stack;
  if (succeed) {
    // If "exam" is the runner, try to push errors and continue.
    var test = is._EXAM_TEST;
    if (test) {
      test.error = test.error || err;
      test.results.push(err);
      return;
    }
  }
  // If "exam" isn't the runner, or we couldn't find the calling test, throw.
  throw err;
}

is.fail = fail;

is.not = function not(actual, expected) {
  var fn = (actual == expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' != ' + deep(expected), not, actual, expected, '!=');
  }
  return is;
};

is.tis = function tis(actual, expected) {
  var fn = (actual !== expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' === ' + deep(expected), tis, actual, expected, '===');
  }
  return is;
};

is.tisNot = function tisNot(actual, expected) {
  var fn = (actual === expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' !== ' + deep(expected), tisNot, actual, expected, '!==');
  }
  return is;
};

is.same = function isSame(actual, expected) {
  var fn = (deep(actual) != deep(expected)) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' same ' + deep(expected), isSame, actual, expected, 'same');
  }
  return is;
};

is.notSame = function isNotSame(actual, expected) {
  var fn = (deep(actual) == deep(expected)) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' notSame ' + deep(expected), isNotSame, actual, expected, 'notSame');
  }
  return is;
};

is.greater = function isGreater(actual, compareTo) {
  var fn = (actual <= expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' > ' + deep(expected), isGreater, actual, expected, '>');
  }
  return is;
};

is.less = function isLess(actual, compareTo) {
  var fn = (actual >= expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' < ' + deep(expected), isLess, actual, expected, '<');
  }
  return is;
};

is.atLeast = function isAtLeast(actual, compareTo) {
  var fn = (actual < expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' >= ' + deep(expected), isAtLeast, actual, expected, '>=');
  }
  return is;
};

is.atMost = function isAtMost(actual, compareTo) {
  var fn = (actual > expected) ? fail : succeed;
  if (fn) {
    fn(deep(actual) + ' <= ' + deep(expected), isAtMost, actual, expected, '<=');
  }
  return is;
};

is.truey = function isTruey(value) {
  var fn = !value ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is truey', isTruey, value, 'is truey');
  }
  return is;
};

is.falsey = function isFalsey(value) {
  var fn = value ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is falsey', isFalsey, value, 'is falsey');
  }
  return is;
};

is.true = function isTrue(value) {
  var fn = (value !== true) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is true', isTrue, value, 'is true');
  }
  return is;
};

is.false = function isFalse(value) {
  var fn = (value !== false) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is false', isFalse, value, 'is false');
  }
  return is;
};

is.null = function isNull(value) {
  var fn = (value !== null) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is null', isNull, value, 'is null');
  }
  return is;
};

is.notNull = function isNotNull(value) {
  var fn = (value === null) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not null', isNotNull, value, 'is not null');
  }
  return is;
};

is.nan = function isNan(value) {
  var fn = !isNaN(value) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is NaN', isNan, value, 'is NaN');
  }
  return is;
};

is.notNan = function isNotNan(value) {
  var fn = isNaN(value) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not NaN', isNotNan, value, 'is not NaN');
  }
  return is;
};

is.type = function isType(value, type) {
  var fn = (typeof value != type) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is ' + type, isType, value, type, 'is ' + type);
  }
  return is;
};

is.notType = function isNotType(value, type) {
  var fn = (typeof value == type) ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is ' + type, isNotType, value, type, 'is ' + type);
  }
  return is;
};

is.undefined = function isUndefined(value) {
  var fn = (typeof value != 'undefined') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is undefined', isUndefined, value, 'is undefined');
  }
  return is;
};

is.defined = function isDefined(value) {
  var fn = (typeof value == 'undefined') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is defined', isDefined, value, 'is defined');
  }
  return is;
};

is.boolean = function isBoolean(value) {
  var fn = (typeof value != 'boolean') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is boolean', isBoolean, value, 'is boolean');
  }
  return is;
};

is.notBoolean = function isNotBoolean(value) {
  var fn = (typeof value == 'boolean') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not boolean', isNotBoolean, value, 'is not boolean');
  }
  return is;
};

is.number = function isNumber(value) {
  var fn = (typeof value != 'number') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is number', isNumber, value, 'is number');
  }
  return is;
};

is.notNumber = function isNotNumber(value) {
  var fn = (typeof value == 'number') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not number', isNotNumber, value, 'is not number');
  }
  return is;
};

is.string = function isString(value) {
  var fn = (typeof value != 'string') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is string', isString, value, 'is string');
  }
  return is;
};

is.notString = function isNotString(value) {
  var fn = (typeof value == 'string') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not string', isNotString, value, 'is not string');
  }
  return is;
};

is.function = function isFunction(value) {
  var fn = (typeof value != 'function') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is function', isFunction, value, 'is function');
  }
  return is;
};

is.notFunction = function isNotFunction(value) {
  var fn = (typeof value == 'function') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not function', isNotFunction, value, 'is not function');
  }
  return is;
};

is.object = function isObject(value) {
  var fn = (typeof value != 'object') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is object', isObject, value, 'is object');
  }
  return is;
};

is.notObject = function isNotObject(value) {
  var fn = (typeof value == 'object') ? fail : succeed;
  if (fn) {
    fn(deep(value) + ' is not object', isNotObject, value, 'is not object');
  }
  return is;
};

is.instance = function (actualValue, expectedClass) {
  var result;
  if (!(actualValue instanceof expectedClass)) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(actualValue) + ' is an instance of ' + expectedClass.name, 1, actualValue, expectedClass, 'is an instance of');
  }
  return is;
};

is.notInstance = function (actualValue, expectedClass) {
  var result;
  if (actualValue instanceof expectedClass) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(actualValue) + ' is not an instance of ' + expectedClass.name, 1, actualValue, expectedClass, 'is not an instance of');
  }
  return is;
};

is.array = function (value) {
  var result;
  if (!(value instanceof Array)) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is an instance of Array', 1, value, Array, 'is an instance of');
  }
  return is;
};

is.notArray = function (value) {
  var result;
  if (value instanceof Array) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is not an instance of Array', 1, value, Array, 'is not an instance of');
  }
  return is;
};

is.date = function (value) {
  var result;
  if (!(value instanceof Date)) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is an instance of Date', 1, value, Date, 'is an instance of');
  }
  return is;
};

is.notDate = function (value) {
  var result;
  if (value instanceof Date) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is not an instance of Date', 1, value, Date, 'is not an instance of');
  }
  return is;
};

is.error = function (value) {
  var result;
  if (!(value instanceof Error)) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is an instance of Error', 1, value, Error, 'is an instance of');
  }
  return is;
};

is.notError = function (value) {
  var result;
  if (value instanceof Error) {
    result = fail;
  }
  else if (is.exam) {
    result = succeed;
  }
  if (result) {
    result(deep(value) + ' is not an instance of Error', 1, value, Error, 'is not an instance of');
  }
  return is;
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
    var length = 0;
    var text;
    var isArray = (data instanceof Array);
    if (stack.length > 10) {
      data = (isArray ? '[Array]' : '[Object]');
    }
    else {
      if (isArray) {
        data.forEach(function (value) {
          text = deep(value, stack, indent);
          length += text.replace().length;
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
            length += getColorlessLength(text);
            parts.push(text);
          }
        }
      }
      stack.pop();
      if (spacing) {
        if (parts.length) {
          length += (parts.length - 1) * 2;
        }
        if (length + indent.length > 60) {
          data = '\n' + indent + parts.join(',\n' + indent) + '\n' + space;
        }
        else {
          data = parts.join(', ');
        }
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
