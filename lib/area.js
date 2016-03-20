
var errors = require('restify-errors');

///--- Errors

errors.makeConstructor('MissingRegistrarError', {
    statusCode: 409,
    restCode: 'MissingRegistrar',
    message: '"registrar_id" is a required parameter'
});

errors.makeConstructor('AreaExistsError', {
    statusCode: 409,
    restCode: 'AreaExists',
    message: 'Area already exists'
});

errors.makeConstructor('AreaNotFoundError', {
        statusCode: 404,
        restCode: 'AreaNotFound',
        message: 'Area was not found'
});

///--- Handlers

/**
 * Creates an 'area', stores it in database
 */
function createArea(req, res, next) {

    if (!req.params.registrar_id) {
        req.log.warn('createArea: missing statement');
        next(new errors.MissingRegistrarError("Parameter 'registrar_id' is required"));
        return;
    }

    if (!req.params.owner_id) {
        req.log.warn('createArea: missing owner');
        next(new errors.MissingOwnerError("Parameter 'owner_id' is required"));
        return;
    }

    var area = {

        id:   req.params.id,
        type: req.params.type,
        space: req.params.space,
        coordinates: req.params.coordinates,
        cost: req.params.cost,
        owner_id: req.params.owner_id,
        registrar_id: req.params.registrar_id
    };

    if (ensureArea(req)) {
        req.log.warn('Area  with id = %s already exists', area.id);
        next(new errors.AreaExistsError("Area with id = " + area.id + " already exists!"));
        return;
    }

    if(!ensureOwner(req)) {
        req.log.warn('No such owner with id = ', area.owner_id);
        next(new errors.OwnerNotFoundError('No such owner with id = ' + area.owner_id));
        return;
    }

    if(!ensureRegistrar(req)) {
        req.log.warn('No such registrar with id = ', area.registrar_id);
        next(new errors.RegistrarNotFoundError('No such registrar with id = ' + area.registrar_id));
        return;
    }

    req.models.area.create(area, function(err) {
        if (err) {
            req.log.warn(err, 'createArea: unable to save');
            next(err);
        } else {
            req.log.debug({area: area}, 'createArea: done');
            res.send(201, area);
            next();
        }
    });
}


/**
 * Deletes an 'area' by id
 */
function deleteArea(req, res, next) {

    if (req.params.id && !ensureArea(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.AreaNotFoundError("Area with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.models.area.get(req.area, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch area from DB.');
          next(err);

      } else {

        result.remove(function (err) {
            if (err) {
                req.log.warn(err,
                    'deleteArea: unable to delete %s',
                    req.area);
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
 * Deletes all areas
 */
function deleteAllAreas(req, res, next) {

    req.models.area.all().remove(function (err) {
        if (err) {
            req.log.warn(err,
                'deleteAllAreas: unable to delete areas');
            next(err);
        } else {
            res.send(204);
            next();
        }
    });

}


/**
 * Loads an 'area' by id
 *
 * Requires `loadAreas` to have run.
 *
 */
function getArea(req, res, next) {

    if (req.params.id && !ensureArea(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.AreaNotFoundError("Area with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.models.area.get(req.area, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch area from DB.');
          next(err);

      } else {
        res.send(200, result);
        next();
      }

    });
}


/**
 * Loads up all the stored areas from database.
 */
function loadAreas(req, res, next) {

    req.models.area.all(function(err, results) {

      if (err) {
          req.log.warn(err,
              'loadAreas: unable to load area from database');
          next(err);
      } else {

        req.areas = results;
        if (req.params.id) {
            req.area = req.params.id;
        }

        req.log.debug({
            area: req.area,
            areas: req.areas
        }, 'loadAreas: done');

        next();
      }

    });

}


/**
 * Simple returns the list of areas that were loaded.
 * This requires loadAreas to have run already.
 */
function listAreas(req, res, next) {
    res.send(200, req.areas);
    next();
}


/**
 * Replaces an 'area' completely.
 */
function putArea(req, res, next) {

    if (req.params.id && !ensureArea(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.AreaNotFoundError("Area with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    if (!req.params.registrar_id) {
        req.log.warn({params: req.params}, 'putArea: missing registrar');
        next(new errors.MissingRegistrarError("Parameter 'registrar_id' is required"));
        return;
    }

    if (!req.params.owner_id) {
        req.log.warn({params: req.params}, 'putArea: missing owner');
        next(new errors.MissingOwnerError("Parameter 'owner_id' is required"));
        return;
    }

    if(!ensureOwner(req)) {
      req.log.warn('No such owner with id = ', req.params.owner_id);
      next(new errors.OwnerNotFoundError('No such owner with id = ' + req.params.owner_id));
      return;
    }

    if(!ensureRegistrar(req)) {
      req.log.warn('No such registrar with id = ', req.params.registrar_id);
      next(new errors.RegistrarNotFoundError('No such registrar with id = ' + req.params.registrar_id));
      return;
    }

    req.models.area.get(req.area, function(err, result){

      if (err) {
          req.log.warn(err, 'putArea: unable to get a area with id = %s', req.area);
          next(err);
      } else {

        result.type = req.params.type;
        result.space = req.params.space;
        result.coordinates = req.params.coordinates;
        result.cost = req.params.cost;
        result.owner_id = req.params.owner_id;
        result.registrar_id = req.params.registrar_id;

        result.save(function (err) {
          if (err) {
            req.log.warn(err, 'putArea: unable to put an area');
            next(err);
          }
          else {
            req.log.debug({area: req.body}, 'putArea: done');
            res.send(204);
            next();
          }
        });
      }
    });
}

////--- Helper functions

/**
 * Checks that an 'area' exists.
 */
function ensureArea(req) {

    return req.areas.some(function(area) {
                                return (area.id == req.params.id) ? true : false;
                              });

}


/**
 * Checks that an 'owner' with id = req.params.owner_id exists.
 */
function ensureOwner(req) {

    return req.owners.some(function(ownr) {
                                return (ownr.id == req.params.owner_id) ? true : false;
                              });

}

/**
 * Checks that a 'registrar' with id = req.params.registrar_id exists.
 */
function ensureRegistrar(req) {

    return req.registrars.some(function(rgstr) {
                                return (rgstr.id == req.params.registrar_id) ? true : false;
                              });

}

///--- Exports

module.exports = {

    createArea: createArea,
    deleteArea: deleteArea,
    deleteAllAreas: deleteAllAreas,
    getArea: getArea,
    loadAreas: loadAreas,
    listAreas: listAreas,
    putArea: putArea
};
