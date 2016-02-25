// bundle all files with pattern .+\.spec.js to run the tests
var context = require.context('.', true, /.+Spec[0-9]*\.jsx?$/);
context.keys().forEach(context);
module.exports = context;