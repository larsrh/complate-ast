import fc from "fast-check";
import {render, ASTBuilder} from "../../../ast/structured";
import * as Stream from "../../../ast/stream";
import {CompactingBuilder} from "../../../ast/builders/compact";
import * as Gen from "../../../testkit/gen";
import {DOMBuilder} from "../../../ast/builders/dom";
import {compareHTML, fromDOM, parseHTML} from "../../../testkit/dom";

describe("Structured AST roundtrips", () => {

    const builder = new ASTBuilder();
    const gen = Gen.defaultAST(builder);

    describe("DOM rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const dom = render(ast, new DOMBuilder(window.document));
                const ast2 = fromDOM(builder, dom);
                const ast1 = render(ast, new CompactingBuilder({ children: false, trueAttributes: true }));
                expect(ast2).toEqual(ast1);
            }));
        });

    });

    describe("HTML rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const ast1 = render(ast, new CompactingBuilder({ trueAttributes: true }));
                const ast2 = fromDOM(builder, parseHTML(document, Stream.force(render(ast, Stream.info().builder))));
                expect(ast2).toEqual(ast1);
            }));
        });

        it("Equal after normalization", () => {
            fc.assert(fc.property(gen, ast => {
                const html1 = Stream.force(render(ast, Stream.info().builder));
                const html2 = Stream.force(render(
                    render(ast, new CompactingBuilder()),
                    Stream.info().builder
                ));
                expect(html2).toEqual(html1);
            }));
        });

    });

    it("DOM/HTML rendering equivalence", () => {

        fc.assert(fc.property(gen.filter(ast => ast.nodeType !== "text"), ast => {
            const html2 = (render(ast, new DOMBuilder(window.document)) as Element).outerHTML;
            const html1 = Stream.force(render(ast, Stream.info().builder));
            compareHTML(html1, html2);
        }));

    })

});