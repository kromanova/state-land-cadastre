
var orm = require('orm');

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

// Database connection
var DATABASE = orm.connect({

    host:     'localhost',
    database: 'cadastredb',
    user:     'root',
    protocol: 'mysql',
    port:     '3306',
    query:    {pool: true, debug: true}
});

// Mainline
(function main() {

    var server = cadastre.createServer({
        db: DATABASE,
        log: LOG,
        noAudit: true
    });

    server.listen((8080), '127.0.0.1', function onListening() {
        LOG.info('listening at %s', server.url);
    });
})();
