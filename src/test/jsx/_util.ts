import {ESTreeBuilder} from "../../jsx/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../../jsx/preprocess/config";
import {AST, astInfos} from "../../ast";
import {Builder} from "../../ast/builder";

const allConfigs: ESTreeBuilderConfig[] = [
    { mode: "runtime", target: "structured" },
    { mode: "runtime", target: "stream" },
    { mode: "runtime", target: "raw" },
    { mode: "optimizing", target: "structured" },
    { mode: "optimizing", target: "stream" },
    { mode: "optimizing", target: "raw" }
];

export function matrix(
    action: (config: ESTreeBuilderConfig, astBuilder: Builder<AST>, esBuilder: ESTreeBuilder) => void
): void {
    describe.each(allConfigs)(`%o`, config =>
        action(config, astInfos[config.target].builder, esTreeBuilderFromConfig(config))
    );
}
