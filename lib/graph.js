/**
 * Returns JSON representation of state-land-cadastre graph.
 *
 */
function getGraphData(req, res, next) {

      var graphData = {};
      graphData.nodes = req.nodes;
      graphData.links = req.links;

      res.send(200, graphData);
      next();

}

/**
 * Loads nodes
 *
 */
function loadNodes(req, res, next) {


    req.nodes = [];
    req.owners.every(doc => req.nodes.push({ name: "owner",
                                                      document: doc,
                                                      group: 1}));

    req.registrars.every(doc => req.nodes.push({ name: "registrar",
                                                      document: doc,
                                                      group: 2}));

    req.documents.every(doc => req.nodes.push({ name: "document",
                                                      document: doc,
                                                      group: 3}));

    req.areas.every(doc => req.nodes.push({name: "area",
                                                  document: doc,
                                                  group: 4}));

    next();
}

/**
 * Fills links
 *
 */
function fillLinks(req, res, next) {

    req.links = [];

    // owner - document edges
    var has_creator = req.db.edgeCollection("has_creator");
    has_creator.all().then(cursor => {
        cursor.all().then(results => {


            for(var i = 0; i < results.length; i++) {

                var link = {
                              source: findIndexByID(results[i]._from, req.nodes),
                              target: findIndexByID(results[i]._to, req.nodes)
                            };
                req.links.push(link);
            }
            // owner - area edges
            var has_owner = req.db.edgeCollection("has_owner");
            has_owner.all().then(cursor => {
                cursor.all().then(results => {
                  for(var i = 0; i < results.length; i++) {

                      var link = {
                                    source: findIndexByID(results[i]._from, req.nodes),
                                    target: findIndexByID(results[i]._to, req.nodes)
                                  };
                      req.links.push(link);
                  }

                  // registrar - area edges
                  var has_registrar = req.db.edgeCollection("has_registrar");
                  has_registrar.all().then(cursor => {
                      cursor.all().then(results => {
                        for(var i = 0; i < results.length; i++) {

                            var link = {
                                          source: findIndexByID(results[i]._from, req.nodes),
                                          target: findIndexByID(results[i]._to, req.nodes)
                                        };
                            req.links.push(link);
                        }

                        next();
                      });
                  });
                });
            });
        });
    });

}

function findIndexByID(id, nodes) {

    var index = -1;
    for(var i = 0; i < nodes.length; i++) {
      if(nodes[i].document._id == id) {
        index = i;
        break;
      }
    }

    return index;
}

///--- Exports

module.exports = {

    getGraphData: getGraphData,
    fillLinks: fillLinks,
    loadNodes: loadNodes
};
