
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

    if (ensureOwner(req)) {
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

    if (req.params.id && !ensureOwner(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.OwnerNotFoundError("Owner with id = " + req.params.id + " doesnt exist!"));
        return;
    }

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
 * Loads an 'owner' by id
 *
 * Requires `loadOwners` to have run.
 *
 */
function getOwner(req, res, next) {

    if (req.params.id && !ensureOwner(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.OwnerNotFoundError("Owner with id = " + req.params.id + " doesnt exist!"));
        return;
    }

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

    if (req.params.id && !ensureOwner(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.OwnerNotFoundError("Owner with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    if (!req.params.name) {
        req.log.warn({params: req.params}, 'putOwner: missing name');
        next(new errors.MissingNameError("Parameter 'name' is required"));
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

////--- Helper functions

/**
 * Checks that an 'owner' exists.
 */
function ensureOwner(req) {

    return req.owners.some(function(ownr) {
                                return (ownr.id == req.params.id) ? true : false;
                              });

}

///--- Exports

module.exports = {

    createOwner: createOwner,
    deleteOwner: deleteOwner,
    deleteAllOwners: deleteAllOwners,
    getOwner: getOwner,
    loadOwners: loadOwners,
    listOwners: listOwners,
    putOwner: putOwner
};
