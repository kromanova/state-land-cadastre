
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

        _key: req.params._key,
        name: req.params.name,
        male: req.params.male || true,
        birthPlace: req.params.birthPlace || "",
        birthDate: req.params.birthDate || "0000-00-00",
        address: req.params.address || ""
    };

    if (ensureOwner(req)) {
        req.log.warn('Owner  with key = %s already exists', owner._key);
        next(new errors.OwnerExistsError("Owner with key = " + owner._key + " already exists!"));
        return;
    }

    var collection = req.db.collection('owner');
    collection.save(owner).then(

      meta => {

        req.log.debug({owner: owner}, 'createOwner: done');
        res.send(201, owner);
        next();
      },
      err => {

        req.log.warn(err, 'createOwner: unable to save');
        next(err);
      }

    );

}


/**
 * Deletes an 'owner' by id
 */
function deleteOwner(req, res, next) {

    if (req.params.id && !ensureOwner(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.OwnerNotFoundError("Owner with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.owner.remove(req.owner).then(() => {

      // TODO deleteOwnerDocuments(result, req);
      // TODO deleteOwnerAreas(result, req);
      res.send(204);
      next();
    });

}

/**
 * Deletes all owners
 */
function deleteAllOwners(req, res, next) {

    req.collections.owner.truncate().then(() => {
      // TODO deleteOwnerDocuments(result, req);
      // TODO deleteOwnerAreas(result, req);
      res.send(204);
      next();
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
        next(new errors.OwnerNotFoundError("Owner with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.owner.vertex(req.params.id).then(result => {
      res.send(200, result.vertex);
      next();
    });

}


/**
 * Loads up all the stored owners from database.
 */
function loadOwners(req, res, next) {

    req.collections.owner.all().then(cursor => {
        cursor.all().then(results => {

            req.owners = results;
            if (req.params.id) {
                req.owner = req.params.id;
            }

            req.log.debug({
                owner: req.owner,
                owners: req.owners
            }, 'loadOwners: done');

            next();
        });
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
        next(new errors.OwnerNotFoundError("Owner with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    if (!req.params.name) {
        req.log.warn({params: req.params}, 'putOwner: missing name');
        next(new errors.MissingNameError("Parameter 'name' is required"));
        return;
    }

    var owner = {

        name: req.params.name,
        male: req.params.male,
        birthPlace: req.params.birthPlace,
        birthDate: req.params.birthDate,
        address: req.params.address
    };

    req.collections.owner.update(req.owner, owner).then(
      meta => {

        req.log.debug({owner: req.body}, 'putOwner: done');
        res.send(204);
        next();
      },
      err => {
        req.log.warn(err, 'putOwner: unable to put an owner');
        next(err);
      }
    );

}

////--- Helper functions

/**
 * Checks that an 'owner' exists.
 */
function ensureOwner(req) {

    return req.owners.some(function(ownr) {
                                return (ownr._key == req.params.id) ? true : false;
                              });

}

/**
 * Removes owner's documents.
 */
function deleteOwnerDocuments(owner, req) {

  owner.getDocuments(function (err, documentsToDelete) {
    if (err) {
        req.log.warn(err, "deleteOwnerDocuments: unable to get owner's documents");
        return;
    }

    documentsToDelete.forEach(function(doc) {
        doc.remove(function (err) {
            if (err) {
                req.log.warn(err, "deleteOwnerDocuments: unable to delete owner's document with doc.id = ", doc.id);
            }
        });
    })
  });

}

/**
 * Removes owner's areas.
 */
function deleteOwnerAreas(owner, req) {

  owner.getAreas(function (err, areasToDelete) {
    if (err) {
        req.log.warn(err, "deleteOwnerAreas: unable to get owner's areas");
        return;
    }

    areasToDelete.forEach(function(area) {
        area.remove(function (err) {
            if (err) {
                req.log.warn(err, "deleteOwnerAreas: unable to delete owner's area with area.id = ", area.id);
            }
        });
    })
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
