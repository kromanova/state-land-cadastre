
var errors = require('restify-errors');

///--- Errors

errors.makeConstructor('MissingStatementError', {
    statusCode: 409,
    restCode: 'MissingStatement',
    message: '"statement" is a required parameter'
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

    var document = {

        id:   req.params.id,
        statement: req.params.statement,
        date: req.params.date,
        enterprise: req.params.enterprise,
        owner_id: req.params.owner_id
    };

    if (ensureDocument(req)) {
        req.log.warn('Document  with id = %s already exists', document.id);
        next(new errors.DocumentExistsError("Document with id = " + document.id + " already exists!"));
        return;
    }

    req.models.document.create(document, function(err) {
        if (err) {
            req.log.warn(err, 'createDocument: unable to save');
            next(err);
        } else {
            req.log.debug({document: document}, 'createDocument: done');
            res.send(201, document);
            next();
        }
    });
}


/**
 * Deletes a 'document' by id
 */
function deleteDocument(req, res, next) {

    if (req.params.id && !ensureDocument(req)) {
        req.log.warn('%s not found', req.params.id);
        next(new errors.DocumentNotFoundError("Document with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.models.document.get(req.document, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch document from DB.');
          next(err);

      } else {

        result.remove(function (err) {
            if (err) {
                req.log.warn(err,
                    'deleteDocument: unable to delete %s',
                    req.document);
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
 * Deletes all documents
 */
function deleteAllDocuments(req, res, next) {

    req.models.document.all().remove(function (err) {
        if (err) {
            req.log.warn(err,
                'deleteAllDocuments: unable to delete documents');
            next(err);
        } else {
            res.send(204);
            next();
        }
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
        next(new errors.DocumentNotFoundError("Document with id = " + req.params.id + " doesnt exist!"));
        return;
    }

    req.models.document.get(req.document, function(err, result){

      if (err) {
          req.log.warn(err, 'get: unable to fetch document from DB.');
          next(err);

      } else {
        res.send(200, result);
        next();
      }

    });
}


/**
 * Loads up all the stored documents from database.
 */
function loadDocuments(req, res, next) {

    req.models.document.all(function(err, results) {

      if (err) {
          req.log.warn(err,
              'loadDocuments: unable to load document from database');
          next(err);
      } else {

        req.documents = results;
        if (req.params.id) {
            req.document = req.params.id;
        }

        req.log.debug({
            document: req.document,
            documents: req.documents
        }, 'loadDocuments: done');

        next();
      }

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

    req.models.document.get(req.document, function(err, result){

      if (err) {
          req.log.warn(err, 'putDocument: unable to get a document with id = %s', req.document);
          next(err);
      } else {

        result.statement = req.params.statement;
        result.date = req.params.date;
        result.enterprise = req.params.enterprise;
        result.owner_id = req.params.owner_id;

        result.save(function (err) {
          if (err) {
            req.log.warn(err, 'putDocument: unable to put a document');
            next(err);
          }
          else {
            req.log.debug({document: req.body}, 'putDocument: done');
            res.send(204);
            next();
          }
        });
      }
    });
}

////--- Helper functions

/**
 * Checks that a 'document' exists.
 */
function ensureDocument(req) {

    return req.documents.some(function(doc) {
                                return (doc.id == req.params.id) ? true : false;
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
