#!/bin/bash

## Tiny script to copy the package into the test meteor app

DEST_PATH=./test/packages/meteor-apm

# reset and create the package-folder
if [[ -d $DEST_PATH ]]; then
  rm -rf $DEST_PATH
fi
mkdir -p $DEST_PATH

cp -rf lib $DEST_PATH/lib
cp package.js $DEST_PATH/package.js
