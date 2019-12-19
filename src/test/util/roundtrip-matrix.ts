import * as Universal from "../../ast/universal";
import {ESTreeBuilder, OptimizingBuilder, RuntimeBuilder} from "../../ast/jsx";
import {allBuilders} from "../../ast/builders";
import * as Stream from "../../ast/stream";
import {StringStream} from "../../stream";

function builders(kind: Universal.Kind): { [name: string]: ESTreeBuilder } {
    return {
        "runtime": new RuntimeBuilder(kind),
        "optimizing": new OptimizingBuilder(kind)
    };
}

export function matrix(
    action: (kind: Universal.Kind, astBuilder: Universal.Builder, name: string, esBuilder: ESTreeBuilder) => void
) {
    for (const [kind, astBuilder] of Object.entries(allBuilders))
        describe(`Kind: ${kind}`, () => {
            for (const [name, esBuilder] of Object.entries(builders(kind as Universal.Kind)))
                describe(`Builder: ${name}`, () => {
                    action(kind as Universal.Kind, astBuilder, name, esBuilder);
                });
        });
}

export function force(ast: any): any {
    if (ast.astType) {
        const type = ast.astType as Universal.Kind;
        // streaming ASTs need to be forced because we can't compare functions
        if (type === "stream") {
            const streamAST = ast as Stream.AST;
            const buffer = new StringStream();
            streamAST.render(buffer);
            return buffer.content;
        }

        return ast;
    }

    throw new Error("Unknown object; not an AST");
}
