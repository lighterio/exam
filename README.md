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

### Dynamic Type Checks

#### is.truthy(value)
Asserts that the value evaluates to **true**, meaning the value is either
`true`, a non-zero number, a non-empty string, a function, or a non-null object.

#### is.falsy(value)
Asserts that the value evaluates to **false**, meaning the value is either
`false`, `0` (zero), `""` (empty string), `null`, `undefined` or `NaN`.

#### is.nan(value)
Asserts that the value evaluates to **true**, meaning the value is either
`true`, a non-zero number, a non-empty string, a function, or a non-null object.

#### is.notNan(value)
Asserts that the value evaluates to **false**, meaning the value is either
`false`, `0` (zero), `""` (empty string), `null`, `undefined` or `NaN`.
