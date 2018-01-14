var GCSAdapter = require('parse-server-gcs-adapter');
var bucketName = "";
 if (process.env.NODE_ENV == "production") {     
    bucketName = "amplified-torch-xxx";
 } else if (process.env.NODE_ENV == "test") { 
    bucketName = "amplified-torch-xxx";
} else { 
    bucketName = "amplified-torch-xxx";
}

var projectId = 'voltaic-spider-169016';

var gcsAdapter = new GCSAdapter(projectId, 
								'./file-storage/.credentials/client_secret.json', 
								bucketName , {
									bucketPrefix: 'web-agro/',
									directAccess: true
								});

  module.exports = gcsAdapter
