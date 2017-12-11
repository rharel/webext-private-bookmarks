rem Minifies libraries and embeds their minified version under sources/libraries/

uglifyjs --comments --compress --mangle --output ../../sources/libraries/LZ_string.min.js --parse bare_returns -- LZ_string.js
