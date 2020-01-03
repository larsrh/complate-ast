import fc from "fast-check";
import * as Structured from "../../../ast/structured";
import * as Stream from "../../../ast/stream";
import {JSDOM} from "jsdom";
import {fromDOM} from "../../../ast/builder";
import {jsdomBuilder} from "../../../ast/builders/nodejs-dom";
import {CompactingBuilder} from "../../../ast/builders/compact";
import * as Gen from "../../../ast/gen";
import {parseHTML} from "../../../ast/builders/dom";

const document = new JSDOM().window.document;

function compareHTML(html1: string, html2: string): void {
    if (html1 === html2)
        return;

    const dom1 = parseHTML(document, html1);
    const dom2 = parseHTML(document, html2);

    expect(dom2).toEqual(dom1);
}

describe("Structured AST roundtrips", () => {

    const builder = Structured.astBuilder;
    const gen = Gen.astNoPrerendered(builder);

    describe("DOM rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const dom = Structured.render(ast, jsdomBuilder);
                const ast2 = fromDOM(builder, dom);
                const ast1 = Structured.render(ast, new CompactingBuilder({ children: false, attributes: true }));
                expect(ast2).toEqual(ast1);
            }));
        });

    });

    describe("HTML rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const buffer = new Stream.StringBuffer();
                Structured.render(ast, Stream.astBuilderNoPrerender).render(buffer);
                const ast1 = Structured.render(ast, new CompactingBuilder());
                const ast2 = fromDOM(builder, parseHTML(document, buffer.content));
                expect(ast2).toEqual(ast1);
            }));
        });

        it("Equal after normalization", () => {
            fc.assert(fc.property(gen, ast => {
                const buffer1 = new Stream.StringBuffer();
                const buffer2 = new Stream.StringBuffer();
                Structured.render(ast, Stream.astBuilderNoPrerender).render(buffer1);
                Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    Stream.astBuilderNoPrerender
                ).render(buffer2);
                expect(buffer2.content).toEqual(buffer1.content);
            }));
        });

    });

    it("DOM/HTML rendering equivalence", () => {

        fc.assert(fc.property(gen.filter(ast => ast.nodeType !== "text"), ast => {
            const html2 = (Structured.render(ast, jsdomBuilder) as Element).outerHTML;
            const buffer = new Stream.StringBuffer();
            Structured.render(ast, Stream.astBuilderNoPrerender).render(buffer);
            compareHTML(buffer.content, html2);
        }));

    })

});