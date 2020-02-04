import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {AST, astInfos} from "../ast";
import {Builder} from "../ast/builder";
import {ESTreeBuilder} from "../jsx/estreebuilder";
import {RuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";
import path from "path";

export const allConfigs: ESTreeBuilderConfig[] = [
    { mode: "simple", target: "structured" },
    { mode: "simple", target: "stream" },
    { mode: "simple", target: "raw" },
    { mode: "optimizing", target: "structured" },
    { mode: "optimizing", target: "stream" },
    { mode: "optimizing", target: "raw" }
];

export const runtimeConfig: RuntimeConfig = {
    prefix: ""
};

export function matrix(
    action: (config: ESTreeBuilderConfig, astBuilder: Builder<AST>, esBuilder: ESTreeBuilder) => void
): void {
    describe.each(allConfigs)(`%o`, config =>
        action(config, astInfos(config.target).builder, esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), config))
    );
}

export function projectRoot(): string {
    return path.resolve(__dirname, "..", "..");
}