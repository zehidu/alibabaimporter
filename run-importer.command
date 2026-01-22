#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

npm start
read -p "Press Enter to close..."
