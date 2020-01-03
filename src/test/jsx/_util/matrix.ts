import * as Universal from "../../../ast/universal";
import {ESTreeBuilder} from "../../../jsx/preprocess";
import {allBuilders} from "../../../ast/builders";
import * as Stream from "../../../ast/stream";
import {isAST, isStream} from "../../../ast/introspection";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../../../jsx/preprocess/config";

const allConfigs: ESTreeBuilderConfig[] = [
    { mode: "runtime", target: "structured" },
    { mode: "runtime", target: "stream" },
    { mode: "runtime", target: "raw" },
    { mode: "optimizing", target: "structured" },
    { mode: "optimizing", target: "stream" },
    { mode: "optimizing", target: "raw" }
];

export function matrix(
    action: (config: ESTreeBuilderConfig, astBuilder: Universal.Builder, esBuilder: ESTreeBuilder) => void
): void {
    describe.each(allConfigs)(`%o`, config =>
        action(config, allBuilders[config.target], esTreeBuilderFromConfig(config))
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
