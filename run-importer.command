#!/bin/bash
set -e
cd "$(dirname "$0")"
node import-alibaba.js
read -p "Press Enter to close..."
