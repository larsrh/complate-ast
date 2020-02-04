import fc from "fast-check";
import * as Structured from "../../../ast/structured";
import * as Stream from "../../../ast/stream";
import {CompactingBuilder} from "../../../ast/builders/compact";
import * as Gen from "../../../testkit/gen";
import {DOMBuilder, fromDOM, parseHTML} from "../../../ast/builders/dom";
import {compareHTML} from "../../../testkit/dom";

describe("Structured AST roundtrips", () => {

    const builder = Structured.info().builder;
    const gen = Gen.defaultAST(builder);

    describe("DOM rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const dom = Structured.render(ast, new DOMBuilder(window.document));
                const ast2 = fromDOM(builder, dom);
                const ast1 = Structured.render(ast, new CompactingBuilder({ children: false, trueAttributes: true }));
                expect(ast2).toEqual(ast1);
            }));
        });

    });

    describe("HTML rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(ast, new CompactingBuilder({ trueAttributes: true }));
                const ast2 = fromDOM(builder, parseHTML(document, Stream.force(Structured.render(ast, Stream.info().builder))));
                expect(ast2).toEqual(ast1);
            }));
        });

        it("Equal after normalization", () => {
            fc.assert(fc.property(gen, ast => {
                const html1 = Stream.force(Structured.render(ast, Stream.info().builder));
                const html2 = Stream.force(Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    Stream.info().builder
                ));
                expect(html2).toEqual(html1);
            }));
        });

    });

    it("DOM/HTML rendering equivalence", () => {

        fc.assert(fc.property(gen.filter(ast => ast.nodeType !== "text"), ast => {
            const html2 = (Structured.render(ast, new DOMBuilder(window.document)) as Element).outerHTML;
            const html1 = Stream.force(Structured.render(ast, Stream.info().builder));
            compareHTML(html1, html2);
        }));

    })

});