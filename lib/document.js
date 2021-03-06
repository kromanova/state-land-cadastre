
var errors = require('restify-errors');

///--- Errors

errors.makeConstructor('MissingStatementError', {
    statusCode: 409,
    restCode: 'MissingStatement',
    message: '"statement" is a required parameter'
});

errors.makeConstructor('MissingOwnerError', {
    statusCode: 409,
    restCode: 'MissingOwner',
    message: '"owner_id" is a required parameter'
});


errors.makeConstructor('DocumentExistsError', {
    statusCode: 409,
    restCode: 'DocumentExists',
    message: 'Document already exists'
});

errors.makeConstructor('DocumentNotFoundError', {
        statusCode: 404,
        restCode: 'DocumentNotFound',
        message: 'Document was not found'
});

///--- Handlers

/**
 * Creates 'document', stores it in database
 */
function createDocument(req, res, next) {

    if (!req.params.statement) {
        req.log.warn('createDocument: missing statement');
        next(new errors.MissingStatementError("Parameter 'statement' is required"));
        return;
    }

    if (!req.params.owner_id) {
        req.log.warn('createDocument: missing owner');
        next(new errors.MissingOwnerError("Parameter 'owner_id' is required"));
        return;
    }

    var document = {

        _key:   req.params._key,
        statement: req.params.statement,
        date: req.params.date || "0000-00-00",
        enterprise: req.params.enterprise,
        owner_id: req.params.owner_id
    };

    if (ensureDocument(req)) {
        req.log.warn('Document  with key = %s already exists', document._key);
        next(new errors.DocumentExistsError("Document with key = " + document._key + " already exists!"));
        return;
    }

    if(!ensureOwner(req)) {
      req.log.warn('No such owner with key = ', req.params.owner_id);
      next(new errors.OwnerNotFoundError('No such owner with key = ' + req.params.owner_id));
      return;
    }

    var collection = req.db.collection('document');
    collection.save(document).then(

      meta => {

        var has_creator = req.db.edgeCollection('has_creator');
        var edge = {};
        var start = String('document/' + meta._key);
        var end = String('owner/' + document.owner_id);
        has_creator.save(edge, start, end);

        req.log.debug({document: document}, 'createDocument: done');
        res.send(201, document);
        next();
      },
      err => {

        req.log.warn(err, 'createDocument: unable to save');
        next(err);
      }

    );
}


/**
 * Deletes a 'document' by id
 */
function deleteDocument(req, res, next) {

    if (req.params.id && !ensureDocument(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.DocumentNotFoundError("Document with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.document.remove(req.document).then(() => {

      var start = String('document/' + req.params.id);
      var has_creator = req.db.edgeCollection('has_creator');
      has_creator.removeByExample({_from: start});
      res.send(204);
      next();
    });
}

/**
 * Deletes all documents
 */
function deleteAllDocuments(req, res, next) {

  req.collections.document.truncate().then(() => {

      var has_creator = req.db.edgeCollection('has_creator');
      has_creator.truncate();
      res.send(204);
      next();
  });

}


/**
 * Loads a 'document' by id
 *
 * Requires `loadDocuments` to have run.
 *
 */
function getDocument(req, res, next) {

    if (req.params.id && !ensureDocument(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.DocumentNotFoundError("Document with key = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.collections.document.vertex(req.params.id).then(result => {
      res.send(200, result.vertex);
      next();
    });
}


/**
 * Loads up all the stored documents from database.
 */
function loadDocuments(req, res, next) {

  req.collections.document.all().then(cursor => {
      cursor.all().then(results => {

          req.documents = results;
          if (req.params.id) {
              req.document = req.params.id;
          }

          req.log.debug({
              document: req.document,
              documents: req.documents
          }, 'loadDocuments: done');

          next();
      });
  });

}


/**
 * Simple returns the list of documents that were loaded.
 * This requires loadDocuments to have run already.
 */
function listDocuments(req, res, next) {
    res.send(200, req.documents);
    next();
}


/**
 * Replaces a 'document' completely.
 */
function putDocument(req, res, next) {

    if (req.params.id && !ensureDocument(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.DocumentNotFoundError("Document with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    if (!req.params.statement) {
        req.log.warn({params: req.params}, 'putDocument: missing statement');
        next(new errors.MissingStatementError("Parameter 'statement' is required"));
        return;
    }

    if (!req.params.owner_id) {
        req.log.warn({params: req.params}, 'putDocument: missing owner');
        next(new errors.MissingOwnerError("Parameter 'owner_id' is required"));
        return;
    }

    if(!ensureOwner(req)) {
      req.log.warn('No such owner with id = ', req.params.owner_id);
      next(new errors.OwnerNotFoundError('No such owner with id = ' + req.params.owner_id));
      return;
    }

    var document = {

        owner_id: req.params.owner_id,
        statement: req.params.statement,
        date: req.params.date,
        enterprise: req.params.enterprise
    };

    req.collections.document.update(req.document, document).then(
      meta => {

        req.log.debug({document: req.body}, 'putDocument: done');
        res.send(204);
        next();
      },
      err => {
        req.log.warn(err, 'putDocument: unable to put an owner');
        next(err);
      }
    );
}

////--- Helper functions

/**
 * Checks that a 'document' exists.
 */
function ensureDocument(req) {

    return req.documents.some(function(doc) {
                                return (doc._key == req.params.id) ? true : false;
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

///--- Exports

module.exports = {

    createDocument: createDocument,
    deleteDocument: deleteDocument,
    deleteAllDocuments: deleteAllDocuments,
    getDocument: getDocument,
    loadDocuments: loadDocuments,
    listDocuments: listDocuments,
    putDocument: putDocument
};
