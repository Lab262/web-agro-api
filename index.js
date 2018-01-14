// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var bodyParser = require("body-parser");
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://heroku_6d16c8ts:utggs6kke5ugdt3uvrj0ui6m4i@ds255767.mlab.com:55767/heroku_6d16c8ts';
var FileStorageAdapter = require(path.join(__dirname, '/file-storage/file-storage-adapter'));
var ErrorHandler = require(path.join(__dirname, '/error-handler/error-handler'));
var EmailAdapter = require(path.join(__dirname, '/email-adapter/email-adapter-object'));
let appId = process.env.APP_ID || 'myAppId';

module.exports.databaseUri = databaseUri;
module.exports.appId = appId

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: appId,
  masterKey: process.env.MASTER_KEY || 'myMasterKey', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  publicServerURL: "http://localhost:1337/parse",
  filesAdapter: FileStorageAdapter,
  verifyUserEmails: false,
  emailAdapter: EmailAdapter.adapterObject
});

var app = express();
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));
// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use(ErrorHandler.errorHandler);

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
  console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
// ParseServer.createLiveQueryServer(httpServer);
