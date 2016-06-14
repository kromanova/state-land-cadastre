
var errors = require('restify-errors');

///--- Errors

errors.makeConstructor('MissingCertificateError', {
    statusCode: 409,
    restCode: 'MissingCertificate',
    message: '"certificate" is a required parameter'
});

errors.makeConstructor('DuplicateCertificateError', {
    statusCode: 409,
    restCode: 'DuplicateCertificate',
    message: 'parameter "certificate" must be unique'
});

errors.makeConstructor('RegistrarExistsError', {
    statusCode: 409,
    restCode: 'RegistrarExists',
    message: 'Registrar already exists'
});

errors.makeConstructor('RegistrarNotFoundError', {
        statusCode: 404,
        restCode: 'RegistrarNotFound',
        message: 'Registrar was not found'
});

///--- Handlers

/**
 * Creates 'registrar', stores it in database
 */
function createRegistrar(req, res, next) {

    if (!req.params.name) {
        req.log.warn('createRegistrar: missing name');
        next(new errors.MissingNameError("Parameter 'name' is required"));
        return;
    }

    if (!req.params.certificate) {
        req.log.warn('createRegistrar: missing certificate');
        next(new errors.MissingCertificateError("Parameter 'certificate' is required"));
        return;
    }

    var registrar = {

        _key:   req.params._key,
        name: req.params.name,
        certificate: req.params.certificate
    };

    if (ensureRegistrar(req)) {
        req.log.warn('Registrar  with id = %s already exists', registrar.id);
        next(new errors.RegistrarExistsError("Registrar with id = " + registrar.id + " already exists!"));
        return;
    }

    if(!ensureUnigueCertificate(req)) {
      req.log.warn("parameter 'certificate' must be unique");
      next(new errors.DuplicateCertificateError("parameter 'certificate' must be unique"));
      return;
    }

    var collection = req.db.collection('registrar');
    collection.save(registrar).then(

      meta => {

        req.log.debug({registrar: registrar}, 'createRegistrar: done');
        res.send(201, registrar);
        next();
      },
      err => {

        req.log.warn(err, 'createRegistrar: unable to save');
        next(err);
      }

    );
}


/**
 * Deletes a 'registrar' by id
 */
function deleteRegistrar(req, res, next) {

    if (req.params.id && !ensureRegistrar(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.RegistrarNotFoundError("Registrar with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.registrar.remove(req.registrar).then(() => {

      // TODO deleteAreas(result, req);
      res.send(204);
      next();
    });
}

/**
 * Deletes all registrars
 */
function deleteAllRegistrars(req, res, next) {

    req.collections.registrar.truncate().then(() => {
      // TODO deleteAreas(result, req);
      res.send(204);
      next();
    });

}

/**
 * Loads a 'registrar' by id
 *
 * Requires `loadRegistrars` to have run.
 *
 */
function getRegistrar(req, res, next) {

    if (req.params.id && !ensureRegistrar(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.RegistrarNotFoundError("Registrar with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.registrar.vertex(req.params.id).then(result => {
      res.send(200, result.vertex);
      next();
    });
}


/**
 * Loads up all the stored registrars from database.
 */
function loadRegistrars(req, res, next) {

  req.collections.registrar.all().then(cursor => {
      cursor.all().then(results => {

          req.registrars = results;
          if (req.params.id) {
              req.registrar = req.params.id;
          }

          req.log.debug({
              registrar: req.registrar,
              registrars: req.registrars
          }, 'loadRegistrars: done');

          next();
      });
  });

}


/**
 * Simple returns the list of registrars that were loaded.
 * This requires loadOwners to have run already.
 */
function listRegistrars(req, res, next) {
    res.send(200, req.registrars);
    next();
}


/**
 * Replaces a 'registrar' completely.
 */
function putRegistrar(req, res, next) {

    if (req.params.id && !ensureRegistrar(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.RegistrarNotFoundError("Registrar with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    if (!req.params.name) {
        req.log.warn({params: req.params}, 'putRegistrar: missing name');
        next(new errors.MissingNameError("Parameter 'name' is required"));
        return;
    }

    if (!req.params.certificate) {
        req.log.warn({params: req.params}, 'putRegistrar: missing certificate');
        next(new errors.MissingCertificateError("Parameter 'certificate' is required"));
        return;
    }

    if(!ensureUnigueCertificate(req)) {
      req.log.warn("parameter 'certificate' must be unique");
      next(new errors.DuplicateCertificateError("parameter 'certificate' must be unique"));
      return;
    }

    var registrar = {

        name: req.params.name,
        certificate: req.params.certificate

    };

    req.collections.registrar.update(req.registrar, registrar).then(
      meta => {

        req.log.debug({registrar: req.body}, 'putRegistrar: done');
        res.send(204);
        next();
      },
      err => {
        req.log.warn(err, 'putRegistrar: unable to put an owner');
        next(err);
      }
    );
}

////--- Helper functions

/**
 * Checks that a 'registrar' exists.
 */
function ensureRegistrar(req) {

    return req.registrars.some(function(rgstr) {
                                return (rgstr._key == req.params.id) ? true : false;
                              });

}


/**
 * Checks that a 'certificate' parameter is unique.
 */
function ensureUnigueCertificate(req) {

    return !req.registrars.some(function(rgtr) {
                                return (rgtr.certificate == req.params.certificate &&
                                   rgtr._key != req.params.id) ? true : false;
                              });

}

/**
 * Removes registrar's areas.
 */
function deleteRegistrarAreas(registrar, req) {

    registrar.getAreas(function (err, areasToDelete) {
      if (err) {
          req.log.warn(err, "deleteRegistrarAreas: unable to get owner's areas");
          return;
      }

      areasToDelete.forEach(function(area) {
          area.remove(function (err) {
              if (err) {
                  req.log.warn(err, "deleteRegistrarAreas: unable to delete owner's area with area.id = ", area.id);
              }
          });
      })
  });

}

///--- Exports

module.exports = {

    createRegistrar: createRegistrar,
    deleteRegistrar: deleteRegistrar,
    deleteAllRegistrars: deleteAllRegistrars,
    getRegistrar: getRegistrar,
    loadRegistrars: loadRegistrars,
    listRegistrars: listRegistrars,
    putRegistrar: putRegistrar
};
