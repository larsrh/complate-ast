# Benchmarking results

```
./dist/benchmark/force.bench.js
Compiling {"mode":"simple","target":"structured"}
Compiling {"mode":"simple","target":"stream"}
Compiling {"mode":"simple","target":"raw"}
Compiling {"mode":"optimizing","target":"structured"}
Compiling {"mode":"optimizing","target":"stream"}
Compiling {"mode":"optimizing","target":"raw"}
Compiling complate-stream
complate-ast (simple/structured) x 267 ops/sec ±4.27% (65 runs sampled)
complate-ast (simple/stream) x 263 ops/sec ±4.04% (64 runs sampled)
complate-ast (simple/raw) x 280 ops/sec ±3.55% (68 runs sampled)
complate-ast (optimizing/structured) x 203 ops/sec ±6.34% (61 runs sampled)
complate-ast (optimizing/stream) x 302 ops/sec ±3.71% (70 runs sampled)
complate-ast (optimizing/raw) x 212 ops/sec ±7.74% (54 runs sampled)
complate-stream x 92.10 ops/sec ±3.66% (51 runs sampled)
./dist/benchmark/pipeline.bench.js
complate-ast (simple/structured) x 19.10 ops/sec ±10.02% (57 runs sampled)
complate-ast (simple/stream) x 24.17 ops/sec ±3.52% (59 runs sampled)
complate-ast (simple/raw) x 25.10 ops/sec ±3.67% (60 runs sampled)
complate-ast (optimizing/structured) x 27.33 ops/sec ±4.94% (66 runs sampled)
complate-ast (optimizing/stream) x 30.97 ops/sec ±4.20% (74 runs sampled)
complate-ast (optimizing/raw) x 33.54 ops/sec ±3.20% (59 runs sampled)
complate-stream x 31.73 ops/sec ±8.93% (60 runs sampled)
./dist/benchmark/preprocess.bench.js
complate-ast (simple/structured) x 2,833 ops/sec ±4.81% (79 runs sampled)
complate-ast (simple/stream) x 2,114 ops/sec ±4.83% (66 runs sampled)
complate-ast (simple/raw) x 2,485 ops/sec ±3.92% (73 runs sampled)
complate-ast (optimizing/structured) x 2,328 ops/sec ±5.09% (71 runs sampled)
complate-ast (optimizing/stream) x 1,593 ops/sec ±5.18% (71 runs sampled)
complate-ast (optimizing/raw) x 2,266 ops/sec ±4.56% (73 runs sampled)
sucrase x 47,471 ops/sec ±5.08% (76 runs sampled)
babel x 170 ops/sec ±5.81% (67 runs sampled)
```
