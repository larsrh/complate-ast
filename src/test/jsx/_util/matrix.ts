import * as Universal from "../../../ast/universal";
import {ESTreeBuilder} from "../../../jsx/preprocess";
import {allBuilders} from "../../../ast/builders";
import * as Stream from "../../../ast/stream";
import {isAST, isStream} from "../../../ast/introspection";
import {OptimizingBuilder} from "../../../jsx/preprocess/optimizing";
import {RuntimeBuilder} from "../../../jsx/preprocess/runtime";

function builders(kind: Universal.Kind): { [name: string]: ESTreeBuilder } {
    return {
        "runtime": new RuntimeBuilder(kind),
        "optimizing": new OptimizingBuilder(kind)
    };
}

export function matrix(
    action: (kind: Universal.Kind, astBuilder: Universal.Builder, name: string, esBuilder: ESTreeBuilder) => void
): void {
    for (const [kind, astBuilder] of Object.entries(allBuilders))
        describe(`Kind: ${kind}`, () => {
            for (const [name, esBuilder] of Object.entries(builders(kind as Universal.Kind)))
                describe(`Builder: ${name}`, () => {
                    action(kind as Universal.Kind, astBuilder, name, esBuilder);
                });
        });
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
