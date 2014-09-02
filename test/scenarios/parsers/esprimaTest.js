var error = new Error();
error.lineNumber = 1;
error.column = 1;
error.stack = 'SyntaxError: Unexpected token\n' +
  '  at parseModule (test/examTest.js:1:1)\n' +
  '  at throwError (node_modules/esprima/esprima.js:1:1)';
throw error;
