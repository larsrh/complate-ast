import fc from "fast-check";
import * as Structured from "../../../ast/structured";
import * as Stream from "../../../ast/stream";
import {JSDOM} from "jsdom";
import {fromDOM} from "../../../ast/builder";
import {StringStream} from "../../../stream";
import {jsdomBuilder} from "../../../ast/builders/nodejs-dom";
import {CompactingBuilder} from "../../../ast/builders/compact";
import {genNoPrerendered} from "../../../ast/gen";

function parseHTML(html: string): Node {
    const document = new JSDOM().window.document;
    const dummy = document.createElement("div");
    dummy.innerHTML = html;
    if (dummy.childNodes.length !== 1)
        throw new Error("Expected exactly one child");
    return dummy.childNodes[0];
}

function compareHTML(html1: string, html2: string): void {
    if (html1 === html2)
        return;

    const dom1 = parseHTML(html1);
    const dom2 = parseHTML(html2);

    expect(dom2).toEqual(dom1);
}

describe("Structured AST roundtrips", () => {

    const builder = Structured.astBuilder;
    const gen = genNoPrerendered(builder);

    describe("DOM rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const dom = Structured.render(ast, jsdomBuilder);
                const ast2 = fromDOM(builder, dom);
                expect(ast2).toEqual(ast);
            }));
        });

    });

    describe("HTML rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const stream = new StringStream();
                Structured.render(ast, Stream.astBuilderNoPrerender).render(stream);
                const ast1 = Structured.render(ast, new CompactingBuilder());
                const ast2 = fromDOM(builder, parseHTML(stream.content));
                expect(ast2).toEqual(ast1);
            }));
        });

        it("Equal after normalization", () => {
            fc.assert(fc.property(gen, ast => {
                const stream1 = new StringStream();
                const stream2 = new StringStream();
                Structured.render(ast, Stream.astBuilderNoPrerender).render(stream1);
                Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    Stream.astBuilderNoPrerender
                ).render(stream2);
                expect(stream2.content).toEqual(stream1.content);
            }));
        });

    });

    it("DOM/HTML rendering equivalence", () => {

        fc.assert(fc.property(gen.filter(ast => ast.nodeType !== "text"), ast => {
            const html2 = (Structured.render(ast, jsdomBuilder) as Element).outerHTML;
            const stream = new StringStream();
            Structured.render(ast, Stream.astBuilderNoPrerender).render(stream);
            compareHTML(stream.content, html2);
        }));

    })

});