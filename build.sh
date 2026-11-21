#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p dist/art
cp index.html app.js archive.js style.css dist/
cp art/afterlight.webp art/mark.svg dist/art/
