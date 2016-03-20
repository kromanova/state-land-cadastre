
var bunyan = require('bunyan');
var restify = require('restify');

var owner = require('./owner');
var registrar = require('./registrar');
var document = require('./document');

/**
 * Defines models
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

  models.registrar = db.define("registrar", {
      name        : String,
      certificate : {type: "integer", unique: true}

  });

  models.document = db.define("document", {
      statement   : {type: "integer"},
      date        :  { type: "date", time: false },
      enterprise  : String

  });

  models.document.hasOne("owner", models.owner, {required: true, reverse: "documents"});

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

    // Register a default '/' handler
    server.get('/', function root(req, res, next) {
        var routes = [
            'GET     /',
            'POST    /owner',
            'GET     /owner',
            'DELETE  /owner',
            'PUT     /owner/:id',
            'GET     /owner/:id',
            'DELETE  /owner/:id',
            'POST    /registrar',
            'GET     /registrar',
            'DELETE  /registrar',
            'PUT     /registrar/:id',
            'GET     /registrar/:id',
            'DELETE  /registrar/:id',
            'POST    /document',
            'GET     /document',
            'DELETE  /document',
            'PUT     /document/:id',
            'GET     /document/:id',
            'DELETE  /document/:id'
        ];
        res.send(200, routes);
        next();
    });

    /**
     * Owner API
     */
    server.use(owner.loadOwners);

    server.post('/owner', owner.createOwner);
    server.get('/owner', owner.listOwners);
    server.head('/owner', owner.listOwners);

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


    /**
     * Registrar API
     */
     server.use(registrar.loadRegistrars);

     server.post('/registrar', registrar.createRegistrar);
     server.get('/registrar', registrar.listRegistrars);
     server.head('/registrar', registrar.listRegistrars);

     // Return a 'registrar' by name
     server.get('/registrar/:id', registrar.getRegistrar);
     server.head('/registrar/:id', registrar.getRegistrar);

     //Put 'registrar'
     server.put({
         path: '/registrar/:id',
         contentType: 'application/json'
     }, registrar.putRegistrar);

     // Delete a 'registrar' by id
     server.del('/registrar/:id', registrar.deleteRegistrar);

     // Delete all records
     server.del('/registrar', registrar.deleteAllRegistrars);


     /**
      * Document API
      */
      server.use(document.loadDocuments);

      server.post('/document', document.createDocument);
      server.get('/document', document.listDocuments);
      server.head('/document', document.listDocuments);

      // Return a 'document' by name
      server.get('/document/:id', document.getDocument);
      server.head('/document/:id', document.getDocument);

      //Put 'document'
      server.put({
          path: '/document/:id',
          contentType: 'application/json'
      }, document.putDocument);

      // Delete a 'document' by id
      server.del('/document/:id', document.deleteDocument);

      // Delete all records
      server.del('/document', document.deleteAllDocuments);

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
