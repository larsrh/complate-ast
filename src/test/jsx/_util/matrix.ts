import {ESTreeBuilder} from "../../../jsx/preprocess";
import * as Stream from "../../../ast/stream";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../../../jsx/preprocess/config";
import {astBuilders, isAST, isStream} from "../../../ast";
import {Builder} from "../../../ast/structured/builder";
import {AST} from "../../../ast/base";

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
        action(config, astBuilders[config.target], esTreeBuilderFromConfig(config))
    );
}

export function force(ast: any): any {
    if (isAST(ast)) {
        // stream ASTs need to be forced because we can't compare functions
        if (isStream(ast))
            return Stream.force(ast);

        return ast;
    }

    throw new Error("Unknown object; not an AST");
}
