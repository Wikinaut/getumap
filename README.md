Node server script to download of an umap.

Fixes https://github.com/umap-project/umap/issues/78#issuecomment-127049535 . Written by/based on code by https://github.com/evanvosberg

`download_umap.js` is intended to be run as route registered in an express.js server.

Required npm packages:

npm install 
- express
- lodash
- superagent
- q


Run as ```node index.js```

Download an umap: ```wget https://yourserver:8000/mapid```
