
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

        id:   req.params.id,
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

    req.models.registrar.create(registrar, function(err) {
        if (err) {
            req.log.warn(err, 'createRegistrar: unable to save');
            next(err);
        } else {
            req.log.debug({registrar: registrar}, 'createRegistrar: done');
            res.send(201, registrar);
            next();
        }
    });
}


/**
 * Deletes a 'registrar' by id
 */
function deleteRegistrar(req, res, next) {


    if (req.params.id && !ensureRegistrar(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.RegistrarNotFoundError("Registrar with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.models.registrar.get(req.registrar, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch registrar from DB.');
          next(err);

      } else {

        result.remove(function (err) {
            if (err) {
                req.log.warn(err,
                    'deleteRegistrar: unable to delete %s',
                    req.registrar);
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
 * Deletes all registrars
 */
function deleteAllRegistrars(req, res, next) {

    req.models.registrar.all().remove(function (err) {
        if (err) {
            req.log.warn(err,
                'deleteAllRegistrars: unable to delete registrars');
            next(err);
        } else {
            res.send(204);
            next();
        }
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
    req.models.registrar.get(req.registrar, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch registrar from DB.');
          next(err);

      } else {
        res.send(200, result);
        next();
      }

    });
}


/**
 * Loads up all the stored registrars from database.
 */
function loadRegistrars(req, res, next) {

      req.models.registrar.all(function(err, results) {

      if (err) {
          req.log.warn(err,
              'loadRegistrars: unable to load registrar from database');
          next(err);
      } else {

        req.registrars = results;
        if (req.params.id) {
            req.registrar = req.params.id;
        }

        req.log.debug({
            registrar: req.registrar,
            registrars: req.registrars
        }, 'loadRegistrars: done');

        next();
      }

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

    req.models.registrar.get(req.registrar, function(err, result){

      if (err) {
          req.log.warn(err, 'putRegistrar: unable to get a registrar with id = %s', req.registrar);
          next(err);
      } else {

        result.name = req.params.name;
        result.certificate = req.params.certificate;

        result.save(function (err) {
          if (err) {
            req.log.warn(err, 'putRegistrar: unable to put a registrar');
            next(err);
          }
          else {
            req.log.debug({registrar: req.body}, 'putRegistrar: done');
            res.send(204);
            next();
          }
        });
      }
    });
}

////--- Helper functions

/**
 * Checks that a 'registrar' exists.
 */
function ensureRegistrar(req) {

    return req.registrars.some(function(rgstr) {
                                return (rgstr.id == req.params.id) ? true : false;
                              });

}


/**
 * Checks that a 'certificate' parameter is unique.
 */
function ensureUnigueCertificate(req) {

    return !req.registrars.some(function(rgtr) {
                                return (rgtr.certificate == req.params.certificate &&
                                   rgtr.id != req.params.id) ? true : false;
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
