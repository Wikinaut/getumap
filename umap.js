'use strict';

const _ = require('lodash');
const Q = require('q');
const superagent = require('superagent');

const requestUrlLayer = (url, mapId) =>  {
    console.log(`GET ${url}`);

    return superagent
        .get(url)
        .set('Accept', '*/*')
        .set('Accept-Encoding', 'gzip, deflate')
        .set('Accept-Language', 'en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7')
        .set('Cache-Control', 'no-cache')
        .set('Connection', 'keep-alive')
        .set('DNT', '1')
        .set('Host', 'umap.openstreetmap.fr')
        .set('Pragma', 'no-cache')
        .set('Referer', `https://umap.openstreetmap.fr/en/map/radnetz_${mapId}`)
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3423.2 Safari/537.36')
        .set('X-Requested-With', 'XMLHttpRequest')
        // Parse layer json
        .then(response => JSON.parse(response.text));
};

const requestIdLayer = (id, mapId) => {
    return requestUrlLayer(`https://umap.openstreetmap.fr/en/datalayer/${id}/`, mapId);
};

const requestMap = (id) => {
    console.log(`GET https://umap.openstreetmap.fr/en/map/radnetz_${id}`);

    return superagent
        .get(`https://umap.openstreetmap.fr/en/map/radnetz_${id}`)
        .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8')
        .set('Accept-Encoding', 'gzip, deflate')
        .set('Accept-Language', 'en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7')
        .set('Cache-Control', 'no-cache')
        .set('Connection', 'keep-alive')
        .set('DNT', '1')
        .set('Host', 'umap.openstreetmap.fr')
        .set('Pragma', 'no-cache')
        .set('Upgrade-Insecure-Requests', '1')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3423.2 Safari/537.36')
        // Pares umap json (extract data from html)
        .then(response => JSON.parse(/<script[^>]*?>\s*var MAP = new L\.U\.Map\([^\{]+([\s\S]+?)\);\s*<\/script>/.exec(response.text)[1]))
};

const umap = {

    ensureHttpsLayer: function (string) {
        return string.replace(/http:\/\/umap\.openstreetmap\.fr/g, 'https://umap.openstreetmap.fr')
    },

    cleanFeature: function (feature) {
        // Rename storage to umap options
        if (_.result(feature, 'properties._umap_options')) {
            delete feature.properties._umap_options;
        }

        return feature;
    },

    cleanLayer: function (layer) {
        // Normalize features;
        layer.features = layer.features.map(feature => umap.cleanFeature(feature));

        return layer;
    },

    clean: function (data) {
        let map;

        // Normalize layers
        map.layers = (map.layers || []).map(layer => umap.cleanLayer(layer));

        return map;
    },

    normalizeFeature: function (feature, options = {}) {
        // Rename storage to umap options
        if (_.result(feature, 'properties._storage_options')) {
            feature.properties._umap_options = feature.properties._storage_options;
            delete feature.properties._storage_options;
        }

        return Q(feature);
    },

    normalizeLayer: function (layer, options = {}) {
        // Rename storage to umap options
        if (layer._storage) {
            layer._umap_options = layer._storage;
            delete layer._storage;
        }

        // Resolve remote layer data
        const remoteUrl = options.resolveRemote && _.result(layer, '_umap_options.remoteData.url');

        if (remoteUrl) {
            return requestUrlLayer(remoteUrl, options.mapId)
                .then(remoteLayer => umap.normalizeLayer(remoteLayer, options))
                .then(remoteLayer => {
                    // Replace features by remote data
                    layer.features = remoteLayer.features;

                    // Remove remote reference
                    layer._umap_options.remoteData = {};

                    return layer;
                });
        }

        // Normalize features;
        const promises = layer.features.map(feature => umap.normalizeFeature(feature, options));

        return Q.all(promises)
            .then(features => {
                layer.features = features;

                return layer;
            });

        return Q(layer);
    },

    normalize: function (data, options = {}) {
        let map;

        map = _.pick(data, ['geometry']);
        map.properties = _.pick(data.properties, ['easing', 'embedControl', 'fullscreenControl', 'searchControl', 'datalayersControl', 'zoomControl', 'slideshow', 'captionBar', 'limitBounds', 'tilelayer', 'licence', 'description', 'name', 'displayPopupFooter', 'miniMap', 'moreControl', 'scaleControl', 'scrollWheelZoom', 'zoom', 'layers']);

        // Normalize layers
        const promises = (map.layers || []).map(layer => umap.normalizeLayer(layer, options));

        return Q.all(promises)
            .then(layers => {
                map.layers = layers;

                return map;
            });
    },

    downloadLayer: function (id, options = {}) {
        return requestIdLayer(id, options.mapId)
            .then(body => umap.normalizeLayer(body, options))
            .then(body => ({
                status: 200,
                body: body
            }))
            .catch(error => {
                const status = error.status || 500;
                const message = error.message || (status === 404 ? 'Page not found.' : status === 500 ? 'Internal server error' : 'Error.');

                return {
                    status: status,
                    message: message
                };
            });
    },

    download: function (id, options) {
        options = _.extend({
            resolveRemote: false
        }, options, {
            mapId: id
        });

        return requestMap(id)
            .then(body => {
                // Get related layers informations
                const datalayers = _.result(body, 'properties.datalayers', []);

                // Format
                return umap.normalize(body)
                    .then(body => {
                        return {
                            body: body,
                            datalayers: datalayers
                        };
                    });
            })
            .then(context => {
                const body = context.body;

                // Fetch related layers
                const promises = context.datalayers.map(layer => umap.downloadLayer(layer.id, options));

                return Q.all(promises)
                    .then(responses => {
                        // Add successful loaded layer
                        responses.map(response => {
                            if (response.status === 200) {
                                body.layers.push(response.body);
                            }

                        });

                        return body;
                    });
            })
            // Result
            .then(body => {
                return {
                    status: 200,
                    body: body
                };
            })
            .catch(error => {
                const status = error.status || 500;
                const message = error.message || (status === 404 ? 'Page not found.' : status === 500 ? 'Internal server error' : 'Error.');

                return {
                    status: status,
                    message: message
                };
            });
    }
};

module.exports = umap;
