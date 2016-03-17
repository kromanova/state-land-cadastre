
var bunyan = require('bunyan');
var restify = require('restify');

var owner = require('./owner');

/**
 * Defines an 'owner' model
 */
function setupModels(db) {

  var models = {};

  models.owner = db.define("owner", {
      name        : String,
      male        : Boolean,
      birthPlace  : String,
      birthDate   : { type: "date", time: false },
      address     : String

  });

  // synchronize all models, creates all
  // the necessary tables if they don't exist
  db.sync(function(err) {
    if (err) throw err;
  });

  return models;

}

///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer(options) {

    // Creates a server with our logger and custom formatter
    var server = restify.createServer({

        log: options.log,
        name: 'state-land-cadastre',
        version: '1.0.0'
    });

    // Ensure we don't drop data on uploads
    server.pre(restify.pre.pause());

    // Clean up sloppy paths like //owner//////1//
    server.pre(restify.pre.sanitizePath());

    // Handles annoying user agents (curl)
    server.pre(restify.pre.userAgentConnection());

    // Set a per request bunyan logger (with requestid filled in)
    server.use(restify.requestLogger());


    // Use the common stuff you probably want
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());


    server.use(function setup(req, res, next) {

        req.db = options.db;
        req.models = setupModels(req.db);

        next();
    });

    server.use(owner.loadOwners);

    server.post('/owner', owner.createOwner);
    server.get('/owner', owner.listOwners);
    server.head('/owner', owner.listOwners);


    // everything else requires that the 'owner' exist
    server.use(owner.ensureOwner);

    // Return an 'owner' by name
    server.get('/owner/:id', owner.getOwner);
    server.head('/owner/:id', owner.getOwner);

    //Put 'owner'
    server.put({
        path: '/owner/:id',
        contentType: 'application/json'
    }, owner.putOwner);

    // Delete an 'owner' by id
    server.del('/owner/:id', owner.deleteOwner);

    // Delete all records
    server.del('/owner', owner.deleteAllOwners);


    // Register a default '/' handler
    server.get('/', function root(req, res, next) {
        var routes = [
            'GET     /',
            'POST    /owner',
            'GET     /owner',
            'DELETE  /owner',
            'PUT     /owner/:id',
            'GET     /owner/:id',
            'DELETE  /owner/:id'
        ];
        res.send(200, routes);
        next();
    });

    // Setup an audit logger
    if (!options.noAudit) {
        server.on('after', restify.auditLogger({
            body: true,
            log: bunyan.createLogger({
                level: 'info',
                name: 'state-land-cadastre-audit',
                stream: process.stdout
            })
        }));
    }

    return (server);
}


///--- Exports

module.exports = {
    createServer: createServer
};
