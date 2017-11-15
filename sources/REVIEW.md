This extension contains two minified files:
 - `/libraries/require.min.js`
 - `/libraries/EventEmitter.min.js`
 
 ## Require.min.js
 
`require.min.js` was obtained from:
http://requirejs.org/docs/release/2.3.5/minified/require.js

## EventEmitter.min.js
`EventEmitter.min.js` was obtained from:
https://github.com/Olical/EventEmitter

Unminified source:
https://github.com/Olical/EventEmitter/blob/ba94e13fe5fb71e0eee89c28ac9d408ae1a1203f/EventEmitter.js

Instructions to produce minified version:
1. Download https://github.com/Olical/EventEmitter/archive/v5.2.3.zip
2. Unzip
3. Install NPM dependencies (`npm install`)
4. Run minifier (`tools/dist.sh`)
