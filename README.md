# <a href="http://lighter.io/exam" style="font-size:40px;text-decoration:none"><img src="https://cdn.rawgit.com/lighterio/lighter.io/master/public/exam.svg" style="width:90px;height:90px"> Exam</a>
[![Chat](https://badges.gitter.im/chat.svg)](//gitter.im/lighterio/public)
[![Version](https://img.shields.io/npm/v/exam.svg)](//www.npmjs.com/package/exam)
[![Downloads](https://img.shields.io/npm/dm/exam.svg)](//www.npmjs.com/package/exam)
[![Build](https://img.shields.io/travis/lighterio/exam.svg)](//travis-ci.org/lighterio/exam)
[![Coverage](https://img.shields.io/codecov/c/github/lighterio/exam/master.svg)](//codecov.io/gh/lighterio/exam)
[![Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](//www.npmjs.com/package/standard)


Exam is a JavaScript test runner, designed to be fast and easy. Its powerful
features are designed to give you everything you need for testing, and more:
* Simple `describe` and `it` functions, like Mocha or Jasmine.
* Simple benchmarking with the `bench` function.
* Simple deferred logging with `alert`, `debug` and `trace` functions.
* Fast assertions with `is` (or use your own).
* Fast mocking with `mock` (or use your own).
* Exam `console` reporter, similar to Mocha's `spec` reporter.
* Multi-CPU test distribution for faster speeds on large test suites.

## Quick Start

Install `exam` globally, or as a dev dependency:
```bash
sudo npm install --global exam
cd PROJECT_DIR
npm install --save-dev exam
```

Write some tests in `test/*.js`:
```js
var a = [1, 2, 3]
describe('Array.indexOf()', function () {
  it("returns -1 when a value isn't found", function () {
    is(a.indexOf(0), -1)
    is(a.indexOf(-1), -1)
  })
  it("returns an index when a value is found", function () {
    is(a.indexOf(1), 0)
    is(a.indexOf(2), 1)
  })
})
```

Run tests:
```bash
exam
```

Run coverage testing, and open reports (if the `open` command is available):
```bash
exam-cover
open coverage/lcov-report/index.html
```


## Test Functions

Exam exposes functions which you can use in your tests. By default, all of
these are available on the global scope. To keep global scope clean instead,
use the `--no-globals` or `-G` command line option.

### Suites and Tests

#### describe(title, fn)
Runs `fn` as a suite of tests.

#### ddescribe(title, fn)
Runs `fn` exclusively. Aliased as `describe.only`.

#### xdescribe(title, fn)
Sets up a suite but skips it. Aliased as `describe.skip`.

#### it(name, fn)
Runs `fn` as a test for the named functionality.

#### iit(name, fn)
Runs `fn` exclusively. Aliased as `it.only`.

#### xit(name, fn)
Sets up a test but skips it. Aliased as `it.skip`.

#### bench(name, fn)
Runs `fn` as a benchmark.

#### bbench(name, fn)
Runs `fn` exclusively. Aliased as `bench.only`.

#### xbench(name, fn)
Sets up a benchmark but skips it. Aliased as `bench.skip`.

#### before(fn)
Runs `fn`** before a suite.

#### beforeEach(fn)
Runs `fn` before each test in a suite.

#### after(fn)
Runs `fn` after a suite.

#### afterEach(fn)
Runs `fn` after each test in a suite.

#### setup/teardown
Aliases for before/after.

### Timeouts
The `this` object inside a test function such as `describe` or `it` has a
`timeout` method that accepts a number of milliseconds. It resets a timeout
that waits for test execution to complete. The default timeout is one second,
so if you need longer, you can customize it.
```js
describe('External service', function () {
  it('takes no more than ten seconds', function (done) {
    this.timeout(10000)
    service.makeRequest(function () {
      done()
    })
  })
})
```

### Assertions and Mocks

#### is(actual, expected)
Asserts strict equality.

#### mock(object, properties)
Temporarily decorates an object with values from a mock properties object.

#### unmock([object])
Restores the original properties of a mocked object (or all mocked objects).

### Logs

#### alert(arguments...)
Stores arguments to be logged after the test run finishes.

#### debug(arguments...)
Stores arguments to be logged after the test run finishes, if called from
within a failing test or suite.

#### trace(arguments...)
Stores arguments and a stack trace to be logged after the test run finishes,
if called from within a failing test or suite.


## Assertions

You can use exam's builtin `is` assertion library, or any other assertion
library that throws an AssertionError.

## is

You can also use `is` methods to make assertions:
```js
var a = [1, 2, 3]
is.array(a)
is.same(a, [1,2,3])
is.number(a[0])
is.is(a[0], 1)
```

Each `is` method also returns `is` so you can chain, if that's your thing:
```js
var a = [1, 2, 3]
is
  .array(a)
  .same(a, [1,2,3])
  .number(a[0])
  .is(a[0], 1)
```

### Comparisons

#### is(actual, expected)
The `is.is` function is also available simply as `is`, allowing a shorthand strict
equality assertion.
```js
var one = 1
is(one, 1)   // No error.
is(one, '1') // Throws an AssertionError.
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

```js
var num = 1
var one = '1'
is.type(num, 'number') // No error.
is.type(one, 'number') // Throws an AssertionError.
is.type(num, 'Number') // Throws an AssertionError.
is.type(one, 'string') // No error.
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
Asserts that the value (string, array, etc.) has no length, or a different
length than specified.

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

```js
describe('myConsole', function () {
  it('calls console.log', function (done) {
    mock(console, {
      log: function () {
        unmock(console)
        done()
      }
    })
  })
})
```

### mock(object, mockedProperties)

When mock is used as a function, it accepts 2 objects. Any properties of the
second object will be copied onto the first object, and if those properties
were already defined on the first, they will be saved so they can be unmocked
later.

In addition, `mock` is an object with several methods for replacing methods
with simple functions that create testable output.

### mock.ignore()

Returns a function that does nothing.

```js
describe('myConsole', function () {
  it('.log does not throw an error', function () {
    mock(console, {
      log: mock.ignore()
    })
    // This logs nothing, despite calling console.log('a').
    myConsole.log('a')
  })
})
```

### mock.count()

Returns a function that increments its `value` property each time it is called.

```js
describe('myConsole', function () {
  it('.log calls console.log once', function () {
    mock(console, {
      log: mock.count()
    })
    is(console.log.value, 0)
    myConsole.log('a')
    is(console.log.value, 1)
    unmock(console)
  })
})
```

### mock.concat([delimiter])

Returns a function whose first argument is concatenated onto its `value`
property each time it is called.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat()
    })
    is(console.log.value, '')
    myConsole.log('a')
    is(console.log.value, 'a')
    myConsole.log('b')
    is(console.log.value, 'ab')
    unmock(console)
  })
})
```

If a delimiter is supplied, it will be used to separate the concatenated
arguments.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat(',')
    })
    is(console.log.value, '')
    myConsole.log(1)
    is(console.log.value, '1')
    myConsole.log(2)
    is(console.log.value, '1,2')
    unmock(console)
  })
})
```

### mock.args([index])

Returns a function that pushes its arguments into an array each time it is
called.

```js
describe('myConsole', function () {
  it('.log calls console.log with multiple arguments', function () {
    mock(console, {
      log: mock.args()
    })
    is.same(console.log.value, [])
    myConsole.log('a')
    is.same(console.log.value, [{0: 'a'}])
    myConsole.log('b', 'c')
    is.same(console.log.value, [{0: 'a'}, {0: 'b', 1: 'c'}])
    unmock(console)
  })
})
```

If an index is supplied, it only pushes one of the arguments.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.args(0)
    })
    is.same(console.log.value, [])
    myConsole.log(1)
    is.same(console.log.value, [1])
    myConsole.log(2, 3)
    is.same(console.log.value, [1, 2])
    unmock(console)
  })
})
```

### mock.fs([config][, createNewFs])

Uses [`mock-fs`](https://www.npmjs.org/package/mock-fs) to create a temporary
in-memory file system for fast, reliable tests. If `createNewFs` is truthy,
Node's built-in [`fs` module](http://nodejs.org/api/fs.html) remains unchanged,
otherwise its methods are mocked.

```js
// Replace Node's `fs` with a temporary file system.
var fs = mock.fs({
  'path/to/fake/dir': {
    'some-file.txt': 'file content here',
    'empty-dir': {} // Empty directory.
  },
  'path/to/some.png': new Buffer([8, 6, 7, 5, 3, 0, 9])
})

// Verify that we can read content.
var content = fs.readFileSync('path/to/fake/dir/some-file.txt')
is(content.toString(), 'file content here')

// Restore Node's built-in file system.
unmock(fs)
```

Calling `mock.fs` sets up a mock file system and returns a reference to Node's
built-in `fs` module, whose methods are now mocked. The resulting file system
has two base directories, `process.cwd()` and `os.tmpdir()`, plus any
directories/files added by the optional `config` object.

A `config` object is a nested structure in which:
* Keys are paths, relative to `process.cwd()`.
* `Buffer` and `string` values are file contents.
* Plain `object` values are directories.

To create a file or directory with additional properties (owner, permissions,
atime, etc.), use `mock.file()` or `mock.directory()`.

**Caveats:**

* Paths should use forward slashes, even on Windows.

* When you use `mock.fs` without the `createNewFs` argument, Node's own `fs`
  module is modified. If you use it **before** any other modules that modify
  `fs` (e.g. `graceful-fs`), the mock should behave as expected.

* The following [`fs` functions](http://nodejs.org/api/fs.html) are overridden:
  `fs.ReadStream`, `fs.Stats`, `fs.WriteStream`, `fs.appendFile`,
  `fs.appendFileSync`, `fs.chmod`, `fs.chmodSync`, `fs.chown`, `fs.chownSync`,
  `fs.close`, `fs.closeSync`, `fs.createReadStream`, `fs.createWriteStream`,
  `fs.exists`, `fs.existsSync`, `fs.fchmod`, `fs.fchmodSync`, `fs.fchown`,
  `fs.fchownSync`, `fs.fdatasync`, `fs.fdatasyncSync`, `fs.fstat`,
  `fs.fstatSync`, `fs.fsync`, `fs.fsyncSync`, `fs.ftruncate`,
  `fs.ftruncateSync`, `fs.futimes`, `fs.futimesSync`, `fs.lchmod`,
  `fs.lchmodSync`, `fs.lchown`, `fs.lchownSync`, `fs.link`, `fs.linkSync`,
  `fs.lstatSync`, `fs.lstat`, `fs.mkdir`, `fs.mkdirSync`, `fs.open`,
  `fs.openSync`, `fs.read`, `fs.readSync`, `fs.readFile`, `fs.readFileSync`,
  `fs.readdir`, `fs.readdirSync`, `fs.readlink`, `fs.readlinkSync`,
  `fs.realpath`, `fs.realpathSync`, `fs.rename`, `fs.renameSync`, `fs.rmdir`,
  `fs.rmdirSync`, `fs.stat`, `fs.statSync`, `fs.symlink`, `fs.symlinkSync`,
  `fs.truncate`, `fs.truncateSync`, `fs.unlink`, `fs.unlinkSync`, `fs.utimes`,
  `fs.utimesSync`, `fs.write`, `fs.writeSync`, `fs.writeFile` and
  `fs.writeFileSync`.

* Mock `fs.Stats` objects have the following properties: `dev`, `ino`, `nlink`,
  `mode`, `size`, `rdev`, `blksize`, `blocks`, `atime`, `ctime`, `mtime`,
  `uid`, and `gid`.  In addition, all of the `is*()` methods are provided (e.g.
  `isDirectory()` and `isFile()`).

* Mock file access is controlled based on file mode where `process.getuid()` and
  `process.getgid()` are available (POSIX systems). On other systems (e.g.
  Windows) the file mode has no effect.

* The following `fs` functions are **not** currently mocked (if your tests use
  these, they will work against the real file system): `fs.FSWatcher`,
  `fs.unwatchFile`, `fs.watch`, and `fs.watchFile`.

### mock.file(properties)

Creates a mock file. Supported properties:

 * **content** - `string|Buffer` File contents.
 * **mode** - `number` File mode (permission and sticky bits).  Defaults to `0666`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last file access time.  Defaults to `new Date()`.  Updated when file contents are accessed.
 * **ctime** - `Date` The last file change time.  Defaults to `new Date()`.  Updated when file owner or permissions change.
 * **mtime** - `Date` The last file modification time.  Defaults to `new Date()`.  Updated when file contents change.

```js
var old = new Date(1)
mock({
  foo: mock.file({
    content: 'file content here',
    ctime: old,
    mtime: old
  })
})
```

### mock.directory(properties)

Creates a mock directory. Supported properties:

 * **mode** - `number` Directory mode (permission and sticky bits).  Defaults to `0777`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last directory access time.  Defaults to `new Date()`.
 * **ctime** - `Date` The last directory change time.  Defaults to `new Date()`.  Updated when owner or permissions change.
 * **mtime** - `Date` The last directory modification time.  Defaults to `new Date()`.  Updated when an item is added, removed, or renamed.
 * **items** - `Object` Directory contents.  Members will generate additional files, directories, or symlinks.

To create a mock filesystem with a directory with the relative path `some/dir` that has a mode of `0755` and a couple child files, you could do something like this:
```js
mock({
  'some/dir': mock.directory({
    mode: 0755,
    items: {
      file1: 'file one content',
      file2: new Buffer([8, 6, 7, 5, 3, 0, 9])
    }
  })
})
```

### mock.symlink(properties)

Create a mock symlink. Supported properties:

 * **path** - `string` Path to the source (required).
 * **mode** - `number` Symlink mode (permission and sticky bits).  Defaults to `0666`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last symlink access time.  Defaults to `new Date()`.
 * **ctime** - `Date` The last symlink change time.  Defaults to `new Date()`.
 * **mtime** - `Date` The last symlink modification time.  Defaults to `new Date()`.

```js
mock({
  'some/dir': {
    'regular-file': 'file contents',
    'a-symlink': mock.symlink({
      path: 'regular-file'
    })
  }
})
```

### unmock(object)

Restores the properties which belonged to the object prior to being mocked.

## Benchmarking

### bench(name, fn)

The bench function is similar to `describe`. It sets up a suite that can
contain multiple `it` calls, declaring implementations to run against each
other. The individual tests are run until Exam is 99% certain that it has
determined which implementation is fastest, or until a timeout is reached -
whichever comes first.

The `bench` function's `this` context has properties which can be modified:
* **benchTime** - `number` The number of milliseconds to spend running the set
  of `it` functions under a `bench` function. The default is 60000ms (1min),
  which is inherited from the `--bench-time` flag.
* **z** - `number` The z-score that is required before declaring a winner. The
  default is 2.576, which equates to 99% confidence.
* **stopZ** - `number` The z-score that results in a benchmark halting
  execution of a test that is clearly far slower than the fastest. The default
  is 30, which is a ridiculously high z-score.

## Running exam

Exam can be run using the command line interface, or by requiring the module.

### `exam` command

Install exam globally (using sudo if your environment
requires root access to install a Node binary):

```bash
sudo npm install -g exam
```

#### Usage
```
exam [OPTIONS] [PATHS...]
```

For example, to run "test/a-test.js" and "test/b-test.js" in multiple processes
and watch for changes:
```bash
exam --multi-process --watch test/a-test test/b-test
```

If there are no `paths` arguments, the path is assumed to be `test`, so test
files include all files directly under the `test` directory.

#### Options


**-h, --help**<br>
Show usage information only.

**-w, --watch**<br>
Keep the process running, watch for file changes, and re-run tests
when a change is detected.

**-V, --version**<br>
Show the version number.

**-r, --require &lt;modules&gt;**<br>
Require a comma-delimited list of modules.

**-R, --reporter &lt;name&gt;**<br>
Which library will be used to output results. Options include "console",
"tap", "xunit" and "counts". *Default: "console"*.

**-G, --no-globals**<br>
Do not add functions such as `it` and `describe` to the global scope. Instead,
add those functions to the `exam` object.

**-v, --recursive**<br>
Use the default `test` directory, or any directories specified as `paths`, and
read their contents recursively, running any encountered files as tests.

**-p, --parser &lt;parser&gt;**<br>
Which EcmaScript parser will be used to handle syntax errors. Options include
"acorn" and "esprima". *Default: "acorn"*.

**-b, --bail**<br>
Exit after the first test failure.

**-a, --assertive**<br>
Stop a test after one failed assertion.

**-g, --grep &lt;regexp&gt;**<br>
Only run files/tests that match a regular expression.

**-i, --ignore &lt;regexp&gt;**<br>
Exclude files/tests that match a regular expression.

**-d, --debug**<br>
Run `node` with the --debug flag.

**-m, --multi-process**<br>
Spawn child processes, creating a cluster of test runners.

**-t, --timeout &lt;millis&gt;**<br>
Test case timeout in milliseconds. (Default: 1000)

**-s, --slow &lt;millis&gt;**<br>
Threshold for a slow test (yellow) warning in milliseconds. (Default: 10)

**-S, --very-slow &lt;millis&gt;**<br>
Threshold for a very slow (red) warning in milliseconds. (Default: 100)

**-A, --hide-ascii**<br>
Do not show ASCII art before the test run.

**-P, --hide-progress**<br>
Do not show passing/failing dots as tests run.

**-C, --no-color**<br>
Turn off color console logging.

**-B, --bench**<br>
Run benchmarks along with the test suite.

**-T, --bench-time**<br>
Run each benchmark for a specified number of milliseconds. (Default: 60000)

### `exam-cover` command

The `exam-cover` command checks coverage using `istanbul`.
  Run exam tests using the istanbul cover command.


#### Usage

exam-cover [EXAM_ARGS] [-- ISTANBUL_ARGS]

#### Options

In addition to the `exam` options above, `exam-cover` supports arguments for
checking coverage (via `istanbul check-coverage`) after the test suite has been
instrumented and executed. Each **&lt;minimum&gt;** is expressed as a whole number
percent, such as 70.

**--statements &lt;minimum&gt;**<br>
Require at least &lt;minimum&gt; statement coverage. (Default: 0)

**--branches &lt;minimum&gt;**<br>
Require at least &lt;minimum&gt; branch coverage. (Default: 0)

**--functions &lt;minimum&gt;**<br>
Require at least &lt;minimum&gt; function coverage. (Default: 0)

**--lines &lt;minimum&gt;**<br>
Require at least &lt;minimum&gt; line coverage. (Default: 0)


### Module

You can also run `exam` from within your Node application. The module exposes
itself as a function that accepts an `options` object containing the arguments
you would pass to the CLI:

```js
var exam = require('exam')
exam({
  paths: ['test'],
  watch: true
})
```


## More on Exam...
* [Contributing](//github.com/lighterio/exam/blob/master/CONTRIBUTING.md)
* [License (ISC)](//github.com/lighterio/exam/blob/master/LICENSE.md)
* [Change Log](//github.com/lighterio/exam/blob/master/CHANGELOG.md)
* [Roadmap](//github.com/lighterio/exam/blob/master/ROADMAP.md)
