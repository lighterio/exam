var error = new Error();
error.loc = {line: 1, column: 1};
error.stack = 'SyntaxError: Unexpected token\n' +
  '  at parseModule (test/examTest.js:1:1)\n' +
  '  at throwError (node_modules/acorn/acorn.js:1:1)';
throw error;
