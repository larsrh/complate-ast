# Benchmarking results

```
./dist/benchmark/preprocess.bench.js
complate-ast (simple/structured) x 10,347 ops/sec ±10.81% (85 runs sampled)
complate-ast (simple/stream) x 9,475 ops/sec ±4.13% (75 runs sampled)
complate-ast (simple/raw) x 9,855 ops/sec ±3.78% (83 runs sampled)
complate-ast (optimizing/structured) x 9,128 ops/sec ±4.87% (77 runs sampled)
complate-ast (optimizing/stream) x 3,546 ops/sec ±5.77% (69 runs sampled)
complate-ast (optimizing/raw) x 8,886 ops/sec ±3.73% (78 runs sampled)
sucrase x 57,705 ops/sec ±2.81% (85 runs sampled)
babel x 238 ops/sec ±6.89% (73 runs sampled)
./dist/benchmark/pipeline.bench.js
complate-ast (simple/structured) x 1.13 ops/sec ±10.52% (11 runs sampled)
complate-ast (simple/stream) x 1.25 ops/sec ±4.71% (11 runs sampled)
complate-ast (simple/raw) x 1.29 ops/sec ±5.13% (11 runs sampled)
complate-ast (optimizing/structured) x 1.27 ops/sec ±6.36% (11 runs sampled)
complate-ast (optimizing/stream) x 1.30 ops/sec ±3.96% (11 runs sampled)
complate-ast (optimizing/raw) x 1.31 ops/sec ±6.21% (11 runs sampled)
complate-stream x 34.93 ops/sec ±6.48% (61 runs sampled)
./dist/benchmark/force.bench.js
Compiling {"mode":"simple","target":"structured"}
Compiling {"mode":"simple","target":"stream"}
Compiling {"mode":"simple","target":"raw"}
Compiling {"mode":"optimizing","target":"structured"}
Compiling {"mode":"optimizing","target":"stream"}
Compiling {"mode":"optimizing","target":"raw"}
Compiling complate-stream
complate-ast (simple/structured) x 383 ops/sec ±1.79% (73 runs sampled)
complate-ast (simple/stream) x 309 ops/sec ±1.65% (79 runs sampled)
complate-ast (simple/raw) x 361 ops/sec ±3.76% (67 runs sampled)
complate-ast (optimizing/structured) x 164 ops/sec ±8.30% (47 runs sampled)
complate-ast (optimizing/stream) x 397 ops/sec ±1.94% (73 runs sampled)
complate-ast (optimizing/raw) x 408 ops/sec ±1.88% (74 runs sampled)
complate-stream x 347 ops/sec ±3.63% (71 runs sampled)
```
