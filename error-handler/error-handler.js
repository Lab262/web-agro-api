// var path = require('path');
// // Imports the Google Cloud client library
// const ErrorReporting = require('@google-cloud/error-reporting');
// // Instantiates a client
// const errors = ErrorReporting({
//   projectId: 'voltaic-spider-169016',
//   keyFilename: path.join(__dirname,'../cloud/.credentials/google_vision_client_secret.json'),
//   ignoreEnvironmentCheck: true
// });
// var errorHandler = errors.express;

var raygun = require('raygun');
var raygunClient = new raygun.Client().init({ apiKey: '1KUHP87pfs+D7ve4srC29w==' });
var errorHandler = raygunClient.expressHandler;
exports.errorHandler = errorHandler;

