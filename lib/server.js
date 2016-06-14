
var bunyan = require('bunyan');
var restify = require('restify');
var jsonpFormatter = require('restify-formatter-jsonp');

var owner = require('./owner');
var registrar = require('./registrar');
var document = require('./document');
var area = require('./area');


/**
 * Setups graph
 */
function setupGraph(database, dbName) {

  database.useDatabase(dbName);
  var graph = database.graph("stateLandGraph");

  database.listGraphs().then(graphs => {
      var graphsNames = graphs.map(function(gr) { return gr._key; });

      if (graphsNames.indexOf("stateLandGraph") <= -1) {
        graph.create();
      }
  });

  return graph;
}

function setupCollections(graph, database) {

  var collections = {};

  collections.owner = graph.vertexCollection("owner");
  collections.registrar = graph.vertexCollection("registrar");
  collections.document = graph.vertexCollection("document");
  collections.area = graph.vertexCollection("area");

  collections.has_creator = graph.edgeCollection("has_creator");
  collections.has_owner = graph.edgeCollection("has_owner");
  collections.has_registrar = graph.edgeCollection("has_registrar");

  database.listCollections().then(cll => {
    if(cll.length > 0) {
      return collections;
    }
  });

  collections.owner.create().then(() => {
    
    collections.registrar.create().then(() => {

      collections.document.create().then(() => {

          collections.area.create().then(() => {

            collections.has_creator.create().then(() => {

              collections.has_owner.create().then(() => {

                collections.has_registrar.create().then(() => {

                  graph.addEdgeDefinition({ collection: "has_creator", from: ['document'], to: ['owner'] }).then(() => {

                    graph.addEdgeDefinition({ collection: "has_owner", from: ['area'], to: ['owner'] }).then(() => {

                      graph.addEdgeDefinition({ collection: "has_registrar", from: ['area'], to: ['registrar'] });

                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    return collections;
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

    // Allows cross-domain requests
    server.pre(
         function crossOrigin(req,res,next){
         res.header("Access-Control-Allow-Origin", "*");
         res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
         res.header("Access-Control-Allow-Headers", "X-Requested-With");
         return next();
      }
    );

    // Set a per request bunyan logger (with requestid filled in)
    server.use(restify.requestLogger());


    // Use the common stuff you probably want
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());

    // JSONP
    server.use(restify.jsonp());
    server.use(function setup(req, res, next) {

        req.db = options.db;
        req.graph = setupGraph(options.db, options.dbName);
        req.collections = setupCollections(req.graph, options.db);

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
            'DELETE  /document/:id',
            'POST    /area',
            'GET     /area',
            'DELETE  /area',
            'PUT     /area/:id',
            'GET     /area/:id',
            'DELETE  /area/:id'
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

    // Return an 'owner' by id
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

     // Return a 'registrar' by id
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

      // Return a 'document' by id
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


      /**
       * Area API
       */
       server.use(area.loadAreas);

       server.post('/area', area.createArea);
       server.get('/area', area.listAreas);
       server.head('/area', area.listAreas);

       // Return an 'area' by id
       server.get('/area/:id', area.getArea);
       server.head('/area/:id', area.getArea);

       //Put 'area'
       server.put({
           path: '/area/:id',
           contentType: 'application/json'
       }, area.putArea);

       // Delete an 'area' by id
       server.del('/area/:id', area.deleteArea);

       // Delete all records
       server.del('/area', area.deleteAllAreas);

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

    // server.use(jsonpFormatter);
    return (server);
}


///--- Exports

module.exports = {
    createServer: createServer
};
