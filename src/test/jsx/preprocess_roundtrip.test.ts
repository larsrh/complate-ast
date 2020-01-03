import {force, matrix} from "./_util/matrix";
import fc from "fast-check";
import * as Gen from "../../ast/gen";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import {extractAST, parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import {runInNewContext} from "vm";
import {generate} from "escodegen";
import {CompactingBuilder} from "../../ast/builders/compact";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

describe("Preprocessing roundtrips", () => {

    matrix((config, astBuilder, esBuilder) => {

        it("Roundtrip", () => {
            const gen = Gen.astNoPrerendered(Structured.astBuilder).filter(ast => ast.nodeType !== "text");
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
                    // TODO more direct equality
                    expect(extracted).toEqual(Structured.render(ast, new CompactingBuilder()));
                }
            }));
        });

    });

});