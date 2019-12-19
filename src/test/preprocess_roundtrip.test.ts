import {matrix} from "./util/roundtrip-matrix";
import fc from "fast-check";
import {genNoPrerendered} from "../ast/gen";
import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import * as Universal from "../ast/universal";
import * as Stream from "../ast/stream";
import {extractAST, parse, preprocess} from "../ast/jsx";
import * as ESTree from "estree";
import {runInNewContext} from "vm";
import {generate} from "escodegen";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../runtime/jsx-runtime";
import {CompactingBuilder} from "../renderers/compact";
import {StringStream} from "../stream";

function force(ast: any): any {
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

describe("Preprocessing roundtrips", () => {

    matrix((kind, astBuilder, name, esBuilder) => {

        test("Roundtrip", () => {
            const gen = genNoPrerendered(Structured.astBuilder).filter(ast => ast.nodeType !== "text");
            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    astBuilder
                );

                const jsx = Structured.render(ast, Raw.astBuilder).value;
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;

                const sandbox = esBuilder.canStatic ? {} : {JSXRuntime: _JSXRuntime};

                const ast2 = runInNewContext(generate(processed), sandbox);
                expect(force(ast2)).toEqual(force(ast1));

                if (esBuilder.canStatic) {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    const extracted = extractAST(inner);
                    expect(extracted).toEqual(ast1);
                }
            }));
        });

    });

});