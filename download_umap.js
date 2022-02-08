'use strict';

const fs = require('fs');
const _ = require('lodash');
const Q = require('q');
const filename = require('./filename');

const umap = require('./umap');

module.exports = function (req, res) {

    const options = {
        resolveRemote: req.query.resolve_remote === 'true'
    };

    umap.download(req.params.id, options)
        .then(response => {
            if (response.status !== 200) {
                return Q.reject(response);
            }

            const downloadFilename = filename.getFilenameWithNowString(_.result(response, 'body.properties.name', 'umap_export') + '.umap');

            // Set download headers
            res.setHeader('Content-disposition', 'attachment; filename=' + downloadFilename);
            res.setHeader('Content-type', 'application/octet-stream');

            // Send status and body
            res.status(200);
            res.send(umap.ensureHttpsLayer(JSON.stringify(response.body, null, 2)));
        })
        .catch(error => {
            res.status(error.status || 500);
            res.send(error.message || 'Internal server error');
        });

};
