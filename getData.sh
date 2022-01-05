#!/usr/bin/env bash

# usage: ./getData.sh ma_eastern

# for availble files and .jpg preview or .xml meta-data see:
# https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Contours/Shape/

# Assumes being run as an npm script to get the right env variables.
# @see https://docs.npmjs.com/cli/v8/configuring-npm/package-json#config
# @see https://docs.npmjs.com/cli/v8/using-npm/config#command-line-flags

# eval is evil, but also useful
eval NAME='$'npm_package_config_"$1"

if [ -z "$NAME" ]; then
  echo "Using default ma_eastern for --shape option"
  NAME=$npm_package_config_ma_eastern
fi

mkdir -p data

pushd data

if [ -d "$NAME" ]; then
  echo "Directory $NAME already exists, doing nothing."
  exit 1
fi

curl -O https://prd-tnm.s3.amazonaws.com/StagedProducts/Contours/Shape/${NAME}.zip
unzip -d ${NAME} ${NAME}.zip

popd
