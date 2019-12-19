import * as Raw from "../../ast/raw";
import * as Universal from "../../ast/universal";
import * as Structured from "../../ast/structured";
import {ESTreeBuilder, OptimizingBuilder, RuntimeBuilder} from "../../ast/jsx";

// TODO add stream
const kinds: { [name: string]: Universal.Builder } = {
    "raw": Raw.astBuilder,
    "structured": Structured.astBuilder
};

function builders(kind: Universal.Kind): { [name: string]: ESTreeBuilder } {
    return {
        "runtime": new RuntimeBuilder(kind),
        "optimizing": new OptimizingBuilder(kind)
    };
}

export function matrix(
    action: (kind: Universal.Kind, astBuilder: Universal.Builder, name: string, esBuilder: ESTreeBuilder) => void
) {
    for (const [kind, astBuilder] of Object.entries(kinds))
        describe(`Kind: ${kind}`, () => {
            for (const [name, esBuilder] of Object.entries(builders(kind as Universal.Kind /* TODO remove */)))
                describe(`Builder: ${name}`, () => {
                    action(kind as Universal.Kind /* TODO remove */, astBuilder, name, esBuilder);
                });
        });
}
