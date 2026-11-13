#!/bin/sh
# Bikin game.min.js dari game.js. Jalankan di folder yang sama dengan game.js:  sh build.sh
# Butuh Node.js. esbuild diunduh otomatis lewat npx (sekali, lalu ke-cache).
set -e
npx --yes esbuild@0.28.2 game.js --minify --target=es2020 --legal-comments=none --charset=utf8 --outfile=game.min.js
echo "game.min.js: $(wc -c < game.min.js) byte"
