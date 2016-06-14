const DATABASE_DEFAULT_NAME = "cadastredb";

var orm = require('orm');
var Database = require('arangojs').Database;

var bunyan = require('bunyan');
var restify = require('restify');

var cadastre = require('./lib');

// Creates bunyan logger
var LOG = bunyan.createLogger({
    name: "state-land-cadastre logger",
    streams: [
        {
            level: (process.env.LOG_LEVEL || 'info'),
            stream: process.stderr
        },
        {

            // WARN and above debug records are spewed to stderr
            level: 'debug',
            type: 'raw',
            stream: new restify.bunyan.RequestCaptureStream({
                level: bunyan.WARN,
                maxRecords: 100,
                maxRequestIds: 1000,
                stream: process.stderr
            })
        }
    ],
    serializers: restify.bunyan.serializers
});

// Mainline
(function main() {

      // Database connection
      database = new Database('http://127.0.0.1:8529');

      database.listDatabases().then(names => {

          if (names.indexOf(DATABASE_DEFAULT_NAME) <= -1) {

              database.createDatabase(DATABASE_DEFAULT_NAME).then(
                  () => LOG.debug('Database "' + DATABASE_DEFAULT_NAME + '" created'),
                  err => LOG.warn('Failed to create database:', err)
              );
          }
      });


      var server = cadastre.createServer({
          db: database,
          dbName: DATABASE_DEFAULT_NAME,
          log: LOG,
          noAudit: true
      });

      server.listen((8080), '127.0.0.1', function onListening() {
          LOG.info('listening at %s', server.url);
      });
})();
