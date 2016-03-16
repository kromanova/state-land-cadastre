
var bunyan = require('bunyan');
var restify = require('restify');
var errors = require('restify-errors');

///--- Errors

errors.makeConstructor('MissingNameError', {
    statusCode: 409,
    restCode: 'MissingName',
    message: '"name" is a required parameter'
});


errors.makeConstructor('OwnerExistsError', {
    statusCode: 409,
    restCode: 'OwnerExists',
    message: 'Owner already exists'
});

errors.makeConstructor('OwnerNotFoundError', {
        statusCode: 404,
        restCode: 'OwnerNotFound',
        message: 'Owner was not found'
});

///--- Handlers

/**
 * Creates 'owner', stores it in database
 */
function createOwner(req, res, next) {

    if (!req.params.name) {
        req.log.warn('createOwner: missing name');
        next(new errors.MissingNameError("Parameter 'name' is required"));
        return;
    }

    var owner = {

        id:   req.params.id,
        name: req.params.name,
        male: req.params.male,
        birthPlace: req.params.birthPlace,
        birthDate: req.params.birthDate,
        address: req.params.address
    };

    var exists = req.owners.some(function(ownr) {
                                return (ownr.id == req.params.id) ? true : false;
                              });

    if (exists) {
        req.log.warn('Owner  with id = %s already exists', owner.id);
        next(new errors.OwnerExistsError("Owner with id = " + owner.id + " already exists!"));
        return;
    }

    req.models.owner.create(owner, function(err) {
        if (err) {
            req.log.warn(err, 'createOwner: unable to save');
            next(err);
        } else {
            req.log.debug({owner: owner}, 'createOwner: done');
            res.send(201, owner);
            next();
        }
    });
}


/**
 * Deletes an 'owner' by id
 */
function deleteOwner(req, res, next) {

    req.models.owner.get(req.owner, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch owner from DB.');
          next(err);

      } else {

        result.remove(function (err) {
            if (err) {
                req.log.warn(err,
                    'deleteOwner: unable to delete %s',
                    req.owner);
                next(err);
            } else {
                res.send(204);
                next();
            }
        });

      }

    });
}

/**
 * Deletes all owners
 */
function deleteAllOwners(req, res, next) {

    req.models.owner.all().remove(function (err) {
        if (err) {
            req.log.warn(err,
                'deleteAllOwners: unable to delete owners');
            next(err);
        } else {
            res.send(204);
            next();
        }
    });

}

/**
 * Checks that an 'owner' exists.
 * Requires 'loadOwners' to have run.
 */
function ensureOwner(req, res, next) {

    var exists = req.owners.some(function(owner) {
                                return (owner.id == req.params.id) ? true : false;
                              });

    if (req.params.id && !exists) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.OwnerNotFoundError("Owner with id = " + req.params.id + " doesnt exist!"));
    } else {
        next();
    }

}


/**
 * Loads an 'owner' by id
 *
 * Requires `loadOwners` to have run.
 *
 */
function getOwner(req, res, next) {

    req.models.owner.get(req.owner, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch owner from DB.');
          next(err);

      } else {
        res.send(200, result);
        next();
      }

    });
}


/**
 * Loads up all the stored owners from database.
 */
function loadOwners(req, res, next) {

    req.models.owner.all(function(err, results) {

      if (err) {
          req.log.warn(err,
              'loadOwners: unable to load owner from database');
          next(err);
      } else {

        req.owners = results;
        if (req.params.id) {
            req.owner = req.params.id;
        }

        req.log.debug({
            owner: req.owner,
            owners: req.owners
        }, 'loadOwners: done');

        next();
      }

    });

}


/**
 * Simple returns the list of owners that were loaded.
 * This requires loadOwners to have run already.
 */
function listOwners(req, res, next) {
    res.send(200, req.owners);
    next();
}


/**
 * Replaces an 'owner' completely.
 */
function putOwner(req, res, next) {

    if (!req.params.name) {
        req.log.warn({params: req.params}, 'putOwner: missing name');
        next(new errors.MissingNameError());
        return;
    }

    req.models.owner.get(req.owner, function(err, result){

      if (err) {
          req.log.warn(err, 'putOwner: unable to get an owner with id = %s', req.owner);
          next(err);
      } else {

        result.name = req.params.name;
        result.male = req.params.male;
        result.birthPlace = req.params.birthPlace;
        result.birthDate = req.params.birthDate;
        result.address = req.params.address;

        result.save(function (err) {
          if (err) {
            req.log.warn(err, 'putOwner: unable to put an owner');
            next(err);
          }
          else {
            req.log.debug({owner: req.body}, 'putOwner: done');
            res.send(204);
            next();
          }
        });
      }
    });
}

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

    server.use(loadOwners);

    server.post('/owner', createOwner);
    server.get('/owner', listOwners);
    server.head('/owner', listOwners);


    // everything else requires that the 'owner' exist
    server.use(ensureOwner);

    // Return an 'owner' by name
    server.get('/owner/:id', getOwner);
    server.head('/owner/:id', getOwner);

    //Put 'owner'
    server.put({
        path: '/owner/:id',
        contentType: 'application/json'
    }, putOwner);

    // Delete an 'owner' by id
    server.del('/owner/:id', deleteOwner);

    // Delete all records
    server.del('/owner', deleteAllOwners);


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
