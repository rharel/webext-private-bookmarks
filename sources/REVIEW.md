This extension contains the following minified files:
 - `/libraries/require.min.js`
 - `/libraries/LZ_string.min.js`
 
 Below are instructions on how to obtain each one.
 
 ## Require.min.js
 
Obtained from: http://requirejs.org/docs/release/2.3.5/minified/require.js

## LZ_string.min.js

1. Download: https://raw.githubusercontent.com/rharel/webext-private-bookmarks/541b1adb0e4c7e4cd11802f4035e21760e7d300f/assets/libraries/LZ_string.js
2. Install UglifyJS 3.2.2 via NPM: `npm install uglify-js@3.2.2 -g`
3. Minify `LZ_string.js` using the following command: `uglifyjs --comments --compress --mangle --output LZ_string.min.js --parse bare_returns -- LZ_string.js`
