#!/bin/sh
# Switch the worktree's vue-jest between the two measured versions. Argument: 3.0.7 | 4.0.1
set -e
W=/Users/svendaneel/okam/web-vuejest
V=$W/node_modules/.lane-vendor
[ -d "$V/vue-jest-$1" ] || { echo "no such staged version: $1"; exit 2; }
rm -rf "$W/node_modules/vue-jest"
cp -Rc "$V/vue-jest-$1" "$W/node_modules/vue-jest"
node -p "require('$W/node_modules/vue-jest/package.json').version"
