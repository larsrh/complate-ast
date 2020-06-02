# Benchmarking results

```
./src/benchmark/force.bench.ts
Compiling {"mode":"simple","target":"structured"}
Compiling {"mode":"simple","target":"stream"}
Compiling {"mode":"simple","target":"raw"}
Compiling {"mode":"optimizing","target":"structured"}
Compiling {"mode":"optimizing","target":"stream"}
Compiling {"mode":"optimizing","target":"raw"}
Compiling complate-stream
complate-ast (simple/structured) x 1,719 ops/sec ±3.47% (75 runs sampled)
complate-ast (simple/stream) x 1,791 ops/sec ±3.29% (77 runs sampled)
complate-ast (simple/raw) x 1,912 ops/sec ±3.25% (75 runs sampled)
complate-ast (optimizing/structured) x 1,902 ops/sec ±5.65% (69 runs sampled)
complate-ast (optimizing/stream) x 2,244 ops/sec ±4.07% (75 runs sampled)
complate-ast (optimizing/raw) x 2,338 ops/sec ±3.29% (77 runs sampled)
complate-stream x 1,646 ops/sec ±2.99% (78 runs sampled)
./src/benchmark/pipeline.bench.ts
complate-ast (simple/structured) x 22.83 ops/sec ±9.66% (63 runs sampled)
complate-ast (simple/stream) x 27.53 ops/sec ±2.67% (65 runs sampled)
complate-ast (simple/raw) x 29.27 ops/sec ±1.52% (69 runs sampled)
complate-ast (optimizing/structured) x 29.79 ops/sec ±1.65% (70 runs sampled)
complate-ast (optimizing/stream) x 29.41 ops/sec ±4.08% (71 runs sampled)
complate-ast (optimizing/raw) x 32.58 ops/sec ±2.22% (74 runs sampled)
complate-stream x 30.23 ops/sec ±4.61% (72 runs sampled)
./src/benchmark/preprocess.bench.ts
complate-ast (simple/structured) x 4,872 ops/sec ±2.44% (86 runs sampled)
complate-ast (simple/stream) x 4,995 ops/sec ±1.40% (92 runs sampled)
complate-ast (simple/raw) x 4,995 ops/sec ±0.62% (93 runs sampled)
complate-ast (optimizing/structured) x 4,413 ops/sec ±2.00% (87 runs sampled)
complate-ast (optimizing/stream) x 3,748 ops/sec ±8.68% (83 runs sampled)
complate-ast (optimizing/raw) x 4,431 ops/sec ±2.84% (87 runs sampled)
sucrase x 75,352 ops/sec ±0.49% (93 runs sampled)
babel x 423 ops/sec ±4.14% (75 runs sampled)
```
