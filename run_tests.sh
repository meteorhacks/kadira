#!/bin/bash

## Tiny script to copy the package into the test meteor app

DEST_PATH=./test/packages/meteor-apm

# reset and create the package-folder
if [[ -d $DEST_PATH ]]; then
  rm -rf $DEST_PATH/lib
  rm -rf $DEST_PATH/package.js
fi
mkdir -p $DEST_PATH

cp -rf lib $DEST_PATH/lib
cp package.js $DEST_PATH/package.js

#exports intenal namespaces in the tests
export __TEST_APM_EXPORTS="Apm, NotificationManager, MethodsModel, PubsubModel, TracerStore"

cd test

PARAMS=""
if [[ $VERBOSE ]]; then
  PARAMS="$PARAMS -V"
fi
laika -g "$1" $PARAMS

cd ..