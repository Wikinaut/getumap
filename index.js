var express = require('express');
var app = express();

const download = require('./download_umap')

app.use('/:id', download)

app.listen(8000, function () {
    console.log('Listening to Port 8000');
});
