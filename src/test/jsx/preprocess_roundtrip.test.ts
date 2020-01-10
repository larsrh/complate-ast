import {matrix} from "./_util";
import fc from "fast-check";
import * as Gen from "../../testkit/gen";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import {parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import {runInNewContext} from "vm";
import {generate} from "astring";
import {CompactingBuilder} from "../../ast/builders/compact";
import {force} from "../../ast";
import {expressionStatement} from "../../estree/operations";
import {extractAST} from "../../jsx/estreebuilders/util";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

describe("Preprocessing (roundtrips)", () => {

    matrix((config, astBuilder, esBuilder) => {

        const gen = Gen.astNoPrerendered(Structured.info.builder).filter(ast => ast.nodeType !== "text");
        const sandbox = esBuilder.canStatic ? {} : {JSXRuntime: _JSXRuntime};

        /*
         * structured AST (gen) -[compact]-> structured AST † -[render]-> target AST
         *       |
         *       | [render/esbuilder]                                        ===
         *       v
         *    ESTree ‡    -------------[eval]-------------------------->  target AST
         *
         *
         * Additional property if esBuilder.canStatic:
         *   static(‡) === †
         */
        it("Structured → ESTree → Preprocess → AST", () => {
            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(ast, new CompactingBuilder());

                const processed = Structured.render(ast1, esBuilder);

                const ast2 = runInNewContext(generate(expressionStatement(processed)), sandbox);
                expect(force(ast2)).toEqual(force(Structured.render(ast1, astBuilder)));

                if (esBuilder.canStatic) {
                    const extracted = extractAST(processed);
                    expect(extracted).toEqual(ast1);
                }
            }));

        });

        /*
         * structured AST (gen) -[compact]-> structured AST † -[render]-> target AST
         *       |
         *       | [render]
         *       v
         *    raw AST
         *       |
         *       | [parse]                                                   ===
         *       v
         *    ESTree
         *       |
         *       | [preprocess]
         *       v
         *    ESTree ‡    -------------[eval]-------------------------->  target AST
         *
         *
         * Additional property if esBuilder.canStatic:
         *   static(‡) === †
         */
        it("Structured → JSX → ESTree → Preprocess → AST", () => {
            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    astBuilder
                );

                const jsx = Structured.render(ast, Raw.info.builder).value;
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;

                const ast2 = runInNewContext(generate(processed), sandbox);
                expect(force(ast2)).toEqual(force(ast1));

                if (esBuilder.canStatic) {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    const extracted = extractAST(inner);
                    expect(extracted).toEqual(Structured.render(ast, new CompactingBuilder()));
                }
            }));
        });

    });

});