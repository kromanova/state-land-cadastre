
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

        _key:   req.params._key,
        type: req.params.type,
        space: req.params.space,
        coordinates: req.params.coordinates,
        cost: req.params.cost,
        owner_id: req.params.owner_id,
        registrar_id: req.params.registrar_id
    };

    if (ensureArea(req)) {
        req.log.warn('Area  with key = %s already exists', area.id);
        next(new errors.AreaExistsError("Area with id = " + area.id + " already exists!"));
        return;
    }

    if(!ensureOwner(req)) {
        req.log.warn('No such owner with key = ', area.owner_id);
        next(new errors.OwnerNotFoundError('No such owner with id = ' + area.owner_id));
        return;
    }

    if(!ensureRegistrar(req)) {
        req.log.warn('No such registrar with key = ', area.registrar_id);
        next(new errors.RegistrarNotFoundError('No such registrar with key = ' + area.registrar_id));
        return;
    }

    var collection = req.db.collection('area');
    collection.save(area).then(

      meta => {

        req.log.debug({area: area}, 'createArea: done');
        res.send(201, area);
        next();
      },
      err => {

        req.log.warn(err, 'createArea: unable to save');
        next(err);
      }

    );
}


/**
 * Deletes an 'area' by id
 */
function deleteArea(req, res, next) {

    if (req.params.id && !ensureArea(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.AreaNotFoundError("Area with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.area.remove(req.owner).then(() => {

      // TODO delete record in 'has_owner'
      res.send(204);
      next();
    });
}

/**
 * Deletes all areas
 */
function deleteAllAreas(req, res, next) {

  req.collections.area.truncate().then(() => {
    // TODO delete all records in 'has_owner'
    res.send(204);
    next();
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
        next(new errors.AreaNotFoundError("Area with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.area.vertex(req.params.id).then(result => {
      res.send(200, result.vertex);
      next();
    });
}


/**
 * Loads up all the stored areas from database.
 */
function loadAreas(req, res, next) {

  req.collections.area.all().then(cursor => {
      cursor.all().then(results => {

          req.areas = results;
          if (req.params.id) {
              req.area = req.params.id;
          }

          req.log.debug({
              area: req.area,
              areas: req.areas
          }, 'loadAreas: done');

          next();
      });
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
      req.log.warn('No such owner with key = ', req.params.owner_id);
      next(new errors.OwnerNotFoundError('No such owner with id = ' + req.params.owner_id));
      return;
    }

    if(!ensureRegistrar(req)) {
      req.log.warn('No such registrar with key = ', req.params.registrar_id);
      next(new errors.RegistrarNotFoundError('No such registrar with id = ' + req.params.registrar_id));
      return;
    }

    var area = {

        owner_id: req.params.owner_id,
        registrar_id: req.params.registrar_id,
        type: req.params.type,
        space: req.params.space,
        coordinates: req.params.coordinates,
        cost: req.params.cost
    };

    req.collections.area.update(req.area, area).then(
      meta => {

        req.log.debug({area: req.body}, 'putArea: done');
        res.send(204);
        next();
      },
      err => {
        req.log.warn(err, 'putArea: unable to put an owner');
        next(err);
      }
    );
}

////--- Helper functions

/**
 * Checks that an 'area' exists.
 */
function ensureArea(req) {

    return req.areas.some(function(area) {
                                return (area._key == req.params.id) ? true : false;
                              });

}


/**
 * Checks that an 'owner' with id = req.params.owner_id exists.
 */
function ensureOwner(req) {

    return req.owners.some(function(ownr) {
                                return (ownr._key == req.params.owner_id) ? true : false;
                              });

}

/**
 * Checks that a 'registrar' with id = req.params.registrar_id exists.
 */
function ensureRegistrar(req) {

    return req.registrars.some(function(rgstr) {
                                return (rgstr._key == req.params.registrar_id) ? true : false;
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
