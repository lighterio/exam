# Exam

[![NPM Version](https://badge.fury.io/js/exam.png)](http://badge.fury.io/js/exam)
[![Build Status](https://travis-ci.org/lighterio/exam.png?branch=master)](https://travis-ci.org/lighterio/exam)
[![Code Coverage](https://coveralls.io/repos/lighterio/exam/badge.png?branch=master)](https://coveralls.io/r/lighterio/exam)
[![Dependencies](https://david-dm.org/lighterio/exam.png?theme=shields.io)](https://david-dm.org/lighterio/exam)
[![Support](http://img.shields.io/gittip/zerious.png)](https://www.gittip.com/lighterio/)

Exam is a Node.js test runner with a default assertion library included. It
forks processes to distribute the test load across cores, because your time is
important.

## Quick Start

Make your test directory.
```
cd myapp
mkdir test
```

Write some tests...
```javascript
describe("Array", function () {
  var a = [1, 2, 3];
  describe('#indexOf()', function () {
    it("returns -1 when a value isn't found", function () {
      is(a.indexOf(5), -1);
      is(a.indexOf(0), -1);
      is(a.indexOf(-1), -1);
    });
    it("returns an index when a value is", function () {
      is(a.indexOf(1), 0);
      is(a.indexOf(2), 1);
      is(a.indexOf(3), 1);
    });
  });
});
```

Install `exam` globally.
```bash
sudo npm install -g exam
```

Run tests.
```bash
exam
```

## Test structure

Exam exposes global functions which you can use in your tests.

* `describe(title, fn)` runs `fn` as a suite of tests.
* `it(does, fn)` runs `fn` to test what something does.
* `is(actual, expected)` asserts equality.
* `before(fn)` runs `fn` before a suite.
* `beforeEach(fn)` runs `fn` before each test in a suite.
* `after(fn)` runs `fn` after a suite.
* `afterEach(fn)` runs `fn` after each test in a suite.

## Assertions

You can use exam's builtin `is` assertion library, or any other assertion
library that throws an AssertionError.

## is

You can also use `is` methods to make assertions:
```javascript
var a = [1, 2, 3];
is.array(a);
is.same(a, [1,2,3]);
is.number(a[0]);
is.is(a[0], 1);
```

Each `is` method also returns `is` so you can chain, if that's your thing:
```javascript
var a = [1, 2, 3];
is
  .array(a)
  .same(a, [1,2,3])
  .number(a[0])
  .is(a[0], 1)
```

### Comparisons

#### is.is(actual, expected)
The `is.is` function is also known simply as `is`, allowing a shorthand strict
equality assertion.
```javascript
var one = 1;
is(one, 1);   // No error.
is(one, '1'); // Throws an AssertionError.
```

It asserts that `actual` is equal to `expected`, and that they are of the same
type.

#### is.not(actual, expected)
Asserts that `actual` is not equal to `expected` (or that they are not of the
same type).

#### is.equal(actual, expected)
Asserts that `actual` is equal to `expected`, within JavaScript's dynamic type
system.

#### is.notEqual(actual, expected)
Asserts that `actual` is **not** equal to `expected`, within JavaScript's
dynamic type system.

#### is.same(actual, expected) *or* is.deepEqual(actual, expected)
Asserts that `actual` is "the same" as `expected`, meaning that their
stringified representations are equal.

#### is.notSame(actual, expected) *or* is.notDeepEqual(actual, expected)
Asserts that `actual` is **not** "the same" as `expected`, meaning that their
stringified representations are unequal.

#### is.greater(first, second)
Asserts that the `first` value is greater than the `second`.

#### is.less(first, second)
Asserts that the `first` value is less than the `second`.

#### is.greaterOrEqual(first, second)
Asserts that the `first` value is greater than or equal to the `second`.

#### is.lessOrEqual(first, second)
Asserts that the `first` value is less than or equal to the `second`.

### Strict Type Checks

#### is.type(value, expectedType)
Asserts that the value is of the expected type, expressed as a case-sensitive
string returned by `typeof`.

```javascript
var num = 1;
var one = '1'
is.type(num, 'number'); // No error.
is.type(one, 'number'); // Throws an AssertionError.
is.type(num, 'Number'); // Throws an AssertionError.
is.type(one, 'string'); // No error.
```

#### is.notType(value, expectedType)
Asserts that the value is **not** of the expected type, expressed as a
case-sensitive string returned by `typeof`.

#### is.null(value)
Asserts that the value is null. This is a strictly-typed assertion.

#### is.notNull(value)
Asserts that the value is **not** null. This is a strictly-typed assertion.

#### is.undefined(value)
Asserts that the value is undefined. This is a strictly-typed assertion.

#### is.notUndefined(value) *or* is.defined(value)
Asserts that the value is **not** undefined. This is a strictly-typed
assertion.

#### is.boolean(value)
Asserts that the value is a boolean. This is a strictly-typed assertion, so
truthy or falsy values which are not actually `true` or `false` will fail this
assertion.

#### is.notBoolean(value)
Asserts that the value is **not** a boolean. This is a strictly-typed, so
`true` and `false` are the only values that will fail this assertion.

#### is.number(value)
Asserts that the value is a number value. This is a strictly-typed assertion,
so strings with numeric values will fail this assertion.

#### is.notNumber(value)
Asserts that the value is a number value. This is a strictly-typed assertion,
so numeric values are the only values that will fail this assertion.

#### is.string(value)
Asserts that the value is a string. This is a strictly-typed assertion.

#### is.notString(value)
Asserts that the value is **not** a string. This is a strictly-typed assertion.

#### is.function(value)
Asserts that the value is a function. This is a strictly-typed assertion.

#### is.notFunction(value)
Asserts that the value is **not** a function. This is a strictly-typed
assertion.

#### is.object(value)
Asserts that the value is an object. This is a strictly-typed assertion.

#### is.notObject(value)
Asserts that the value is **not** an object. This is a strictly-typed
assertion.

### Value Checks

#### is.true(value)
Asserts that the value is the boolean value `true`.

#### is.notTrue(value)
Asserts that the value is **not** the boolean value `true`.

#### is.false(value)
Asserts that the value is the boolean value `false`.

#### is.notFalse(value)
Asserts that the value is **not** the boolean value `false`.

#### is.truthy(value)
Asserts that the value evaluates to **true**, meaning the value is either
`true`, a non-zero number, a non-empty string, a function, or a non-null object.

#### is.falsy(value)
Asserts that the value evaluates to **false**, meaning the value is either
`false`, `0` (zero), `""` (empty string), `null`, `undefined` or `NaN`.

#### is.nan(value)
Asserts that the value cannot be evaluated as a number. This includes anything
that is not a number, a string representation of a number, `null` (which
evaluates to zero), `false` (which evaluates to zero) or a `Date` object.

#### is.notNan(value)
Asserts that the value **can** be evaluated as a number. This includes
numbers, a string representations of numbers, `null` (which
evaluates to zero), `false` (which evaluates to zero) and `Date` objects.

### Instance Checks

#### is.instanceOf(value, expectedClass)
Asserts that the value is an instance of the expected class.

#### is.notInstanceOf(value, expectedClass)
Asserts that the value is **not** an instance of the expected class.

#### is.array(value)
Asserts that the value is an instance of the `Array` class.

#### is.notArray(value)
Asserts that the value is **not** an instance of the `Array` class.

#### is.date(value)
Asserts that the value is an instance of the `Date` class.

#### is.notDate(value)
Asserts that the value is **not** an instance of the `Date` class.

#### is.error(value)
Asserts that the value is an instance of the `Error` class.

#### is.notError(value)
Asserts that the value is **not** an instance of the `Error` class.

#### is.regExp(value)
Asserts that the value is an instance of the `RegExp` class.

#### is.notRegExp(value)
Asserts that the value is **not** an instance of the `RegExp` class.

### Advanced

#### is.in(value, search)
Asserts that `value` is a string and that it contains a substring `search`
or matches a regular expression `search`.

#### is.notIn(value, search)
Asserts that either 1) `value` is not a string, 2) `search` is not
a string or regular expression, or 3) `search` is not found in `value`.

#### is.lengthOf(value, length)
Asserts that the value (string, array, etc.) has the specified length.

#### is.notLengthOf(value, length)
Asserts that the value (string, array, etc.) does not have the specified length.

#### is.arrayOf(value, expectedTypeOrClass)
Asserts that the value is an array of the specified type or an array of
instances of the specified class (depending on whether the second argument
is a string).

#### is.notArrayOf(value, expectedTypeOrClass)
Asserts that the value is not an array, or contains an item that is not of the
specified type or an item that is not an instance of the specified class
(depending on whether the second argument is a string).

## Mocking

You can use exam's builtin `mock` library, or any other mocking library
you like. The `mock` library exposes 2 globals, `mock` and `unmock`:

```javascript
describe('myConsole', function () {
  it('calls console.log', function (done) {
    mock(console, {
      log: function () {
        unmock(console);
        done();
      }
    });
  });
});
```

### mock(object, mockedProperties)

When mock is used as a function, it accepts 2 objects. Any properties of the
second object will be copied onto the first object, and if those properties
were already defined on the first, they will be saved so they can be unmocked
later.

In addition, `mock` is an object with several methods for replacing methods
with simple functions that create testable output.

#### mock.ignore()

Returns a function that does nothing.

```javascript
describe('myConsole', function () {
  it('.log does not throw an error', function () {
    mock(console, {
      log: mock.ignore()
    });
    // This logs nothing, despite calling console.log('a').
    myConsole.log('a');
  });
});
```

#### mock.count()

Returns a function that increments its `value` property each time it is called.

```javascript
describe('myConsole', function () {
  it('.log calls console.log once', function () {
    mock(console, {
      log: mock.count()
    });
    is(console.log.value, 0);
    myConsole.log('a');
    is(console.log.value, 1);
    unmock(console);
  });
});
```

#### mock.concat([delimiter])

Returns a function whose first argument is concatenated onto its `value`
property each time it is called.

```javascript
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat()
    });
    is(console.log.value, '');
    myConsole.log('a');
    is(console.log.value, 'a');
    myConsole.log('b');
    is(console.log.value, 'ab');
    unmock(console);
  });
});
```

If a delimiter is supplied, it will be used to separate the concatenated
arguments.

```javascript
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat(',')
    });
    is(console.log.value, '');
    myConsole.log(1);
    is(console.log.value, '1');
    myConsole.log(2);
    is(console.log.value, '1,2');
    unmock(console);
  });
});
```

#### mock.args([index])

Returns a function that pushes its arguments into an array each time it is
called.

```javascript
describe('myConsole', function () {
  it('.log calls console.log with multiple arguments', function () {
    mock(console, {
      log: mock.args()
    });
    is.same(console.log.value, []);
    myConsole.log('a');
    is.same(console.log.value, [{0: 'a'}]);
    myConsole.log('b', 'c');
    is.same(console.log.value, [{0: 'a'}, {0: 'b', 1: 'c'}]);
    unmock(console);
  });
});
```

If an index is supplied, it only pushes one of the arguments.

```javascript
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.args(0)
    });
    is.same(console.log.value, []);
    myConsole.log(1);
    is.same(console.log.value, [1]);
    myConsole.log(2, 3);
    is.same(console.log.value, [1, 2]);
    unmock(console);
  });
});
```

### unmock(object)

Restores the properties which belonged to the object prior to being mocked.

## Running exam

Exam can be run using the command line interface, or by requiring the module.

### Command line

To install the CLI, install exam globally (using sudo if your environment
requires root access to install a Node binary):

```bash
npm install -g exam
```

Then to run the command line, use a command such as this to run all tests
under inside the `test` folder of the current working directory and re-run
upon changes to files:
```
exam --watch test
```

The last argument is optional (and multiple paths are allowed). If omitted,
the path is assumed to be `test`.

### Module

You can also run `exam` from within your Node application. The module exposes
itself as a function that accepts an `options` object containing the arguments
you would pass to the CLI:

```javascript
var exam = require('exam');
exam({
  paths: ['test'],
  watch: true
});
```

### Options

| CLI argument   | Object property | Default   | Description                  |
|----------------|-----------------|-----------|------------------------------|
| -R, --reporter | reporter        | "console" | Which library will be used to output results - "console", "tap" or "xunit". |
| -p, --parser   | parser          | "acorn"   | Which EcmaScript parser will be used to handle syntax errors - "acorn" or "esprima". |                             |
| -w, --watch    | watch           | false     | Whether to keep the process running, watch for file changes, and re-run tests when a change is detected. |
| -c, --cluster  | cluster         | true      | Whether to spawn child processes, creating a cluster of test runners. |
