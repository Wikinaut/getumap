'use strict';

const fs = require('fs');
const _ = require('lodash');
const Q = require('q');

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

            let filename = '';

            const today = new Date();

            const year = today.getFullYear();
            filename += year;

            const month = today.getMonth() + 1;
            filename += month < 10 ? ('0' + month) : month;

            const day = today.getDate();
            filename += day < 10 ? ('0' + day) : day;

            const hour = today.getHours();
            filename += hour < 10 ? ('0' + hour) : hour;

            const minute = today.getMinutes();
            filename += minute < 10 ? ('0' + minute) : minute;
            filename += '_';

            filename += _.result(response, 'body.properties.name', 'umap_export').replace(/[^A-Za-z0-9\-\_\. ]/g, '');
            filename += '.umap';

            // Set download headers
            res.setHeader('Content-disposition', 'attachment; filename=' + filename);
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
