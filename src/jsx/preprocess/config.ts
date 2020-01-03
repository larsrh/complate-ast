import {ESTreeBuilder} from "../preprocess";
import {RuntimeBuilder} from "./runtime";
import {identifier} from "../../estree/operations";
import {Runtime} from "./util";
import {Factory, OptimizingBuilder} from "./optimizing";
import {StructuredFactory} from "./optimizing/structured";
import {StreamFactory} from "./optimizing/stream";
import {RawFactory} from "./optimizing/raw";
import {Kind} from "../../ast/base";

export interface ESTreeBuilderConfig {
    mode: "runtime" | "optimizing";
    target: Kind;
    runtime?: string;
}

function factoryFromTarget(target: Kind): Factory {
    switch (target) {
        case "structured": return new StructuredFactory();
        case "stream":     return new StreamFactory();
        case "raw":        return new RawFactory();
    }
}

export function esTreeBuilderFromConfig(config: ESTreeBuilderConfig): ESTreeBuilder {
    const runtime = new Runtime(
        identifier(config.runtime === undefined ? "JSXRuntime" : config.runtime),
        config.target
    );
    switch (config.mode) {
        case "runtime":
            return new RuntimeBuilder(config.target, runtime);
        case "optimizing":
            return new OptimizingBuilder(factoryFromTarget(config.target), runtime);
    }
}
