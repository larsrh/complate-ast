import {MetaASTInfo, RuntimeBuilder} from "./runtime";
import {identifier} from "../../estree/operations";
import {RuntimeModule} from "./util";
import {Factory, OptimizingBuilder} from "./optimizing";
import {StructuredFactory} from "./optimizing/structured";
import {StreamFactory} from "./optimizing/stream";
import {RawFactory} from "./optimizing/raw";
import {astInfos, Kind} from "../../ast";
import {ESTreeBuilder} from "../estreebuilder";

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

function metaInfo(kind: Kind): MetaASTInfo<any> {
    return {
        ...astInfos[kind],
        fragmentMacro: runtime => runtime._member("Fragment"),
        runtimeBuilder: runtime => runtime._member(`${kind}Builder`)
    }
}

export function esTreeBuilderFromConfig(config: ESTreeBuilderConfig): ESTreeBuilder {
    const runtime = new RuntimeModule(
        identifier(config.runtime === undefined ? "JSXRuntime" : config.runtime),
        config.target
    );
    switch (config.mode) {
        case "runtime":
            return new RuntimeBuilder(runtime, metaInfo(config.target));
        case "optimizing":
            return new OptimizingBuilder(factoryFromTarget(config.target), runtime);
    }
}
