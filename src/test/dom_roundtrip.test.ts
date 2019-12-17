import fc from "fast-check";
import {render, StructuredBuilder} from "../ast/structured";
import {JSDOM} from "jsdom";
import {fromDOM} from "../ast/builder";
import {StringStream} from "../stream";
import {jsdomBuilder} from "../renderers/nodejs-dom";
import {streamBuilderNoPrerender} from "../ast/stream";
import {NormalizingBuilder} from "../renderers/map";
import {genNoPrerendered} from "../ast/gen";

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

describe("Structured AST", () => {

    const builder = new StructuredBuilder<never>();
    const gen = genNoPrerendered(builder);

    describe("DOM rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const dom = render(ast, jsdomBuilder);
                const ast2 = fromDOM(builder, dom);
                expect(ast2).toEqual(ast);
            }));
        });

    });

    describe("HTML rendering", () => {

        it("Roundtrip property", () => {
            fc.assert(fc.property(gen, ast => {
                const stream = new StringStream();
                render(ast, streamBuilderNoPrerender).render(stream);
                const ast1 = render(ast, new NormalizingBuilder());
                const ast2 = fromDOM(builder, parseHTML(stream.content));
                expect(ast2).toEqual(ast1);
            }));
        });

        it("Equal after normalization", () => {
            fc.assert(fc.property(gen, ast => {
                const stream1 = new StringStream();
                const stream2 = new StringStream();
                render(ast, streamBuilderNoPrerender).render(stream1);
                render(render(ast, new NormalizingBuilder()), streamBuilderNoPrerender).render(stream2);
                expect(stream2.content).toEqual(stream1.content);
            }));
        });

    });

    it("DOM/HTML rendering equivalence", () => {

        fc.assert(fc.property(gen.filter(ast => ast.nodeType !== "text"), ast => {
            const html2 = (render(ast, jsdomBuilder) as Element).outerHTML;
            const stream = new StringStream();
            render(ast, streamBuilderNoPrerender).render(stream);
            compareHTML(stream.content, html2);
        }));

    })

});