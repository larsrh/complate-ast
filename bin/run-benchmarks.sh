#!/usr/bin/env bash
find ./src/benchmark -name "*.bench.ts" | while read -r FILE; do
  echo "$FILE"
  ts-node -r esm "$FILE"
done
