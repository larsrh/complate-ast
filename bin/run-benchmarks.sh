#!/usr/bin/env bash
find ./dist/benchmark -name "*.bench.js" | while read -r FILE; do
  echo "$FILE"
  node -r esm "$FILE"
done
