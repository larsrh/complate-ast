import {SimpleBuilder} from "./simple";
import {Factory, OptimizingBuilder} from "./optimizing";
import {StructuredFactory} from "./optimizing/structured";
import {StreamFactory} from "./optimizing/stream";
import {RawFactory} from "./optimizing/raw";
import {Kind} from "../../ast";
import {ESTreeBuilder} from "../estreebuilder";
import {RuntimeModule} from "../runtime";

export interface ESTreeBuilderConfig {
    mode: "simple" | "optimizing";
    target: Kind;
}

function factoryFromTarget(target: Kind): Factory {
    switch (target) {
        case "structured": return new StructuredFactory();
        case "stream":     return new StreamFactory();
        case "raw":        return new RawFactory();
    }
}

export function esTreeBuilderFromConfig(runtime: RuntimeModule, config: ESTreeBuilderConfig): ESTreeBuilder {
    switch (config.mode) {
        case "simple":
            return new SimpleBuilder(runtime, config.target);
        case "optimizing":
            return new OptimizingBuilder(factoryFromTarget(config.target), runtime);
    }
}
