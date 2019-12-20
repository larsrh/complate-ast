import * as Structured from "../../ast/structured";
import * as Stream from "../../ast/stream";
import {genNoPrerendered, genWithPrerendered} from "../../ast/gen";
import fc from "fast-check";
import {CompactingBuilder} from "../../ast/builders/compact";
import {StringStream} from "../../stream";

describe("Structured AST basics", () => {

    const builder = Structured.astBuilder;
    const gen = genWithPrerendered(builder, fc.integer());

    it("map(identity)", () => {
        fc.assert(fc.property(gen, ast => {
            const ast2 = Structured.map(ast, x => x);
            expect(ast2).toEqual(ast);
        }));
    });

    it("render-then-build", () => {
        fc.assert(fc.property(gen, ast => {
            const ast2 = Structured.render(ast, builder);
            expect(ast2).toEqual(ast);
        }));
    });

    it("normalize idempotence", () => {
        fc.assert(fc.property(gen, ast => {
            const ast2 = Structured.render(ast, new CompactingBuilder());
            const ast3 = Structured.render(ast2, new CompactingBuilder());
            expect(ast3).toEqual(ast2);
        }));
    });

    it("structured collapse", () => {
        const gen = genWithPrerendered(new Structured.ASTBuilder<Structured.AST<never>>(), genNoPrerendered(builder));
        fc.assert(fc.property(gen, ast => {
            const ast1 = Structured.flatten(ast);
            const ast2 = Structured.map(ast, inner => Structured.render(inner, Stream.astBuilderNoPrerender));

            const stream1 = new StringStream();
            const stream2 = new StringStream();

            Structured.render(ast1, Stream.astBuilderNoPrerender).render(stream1);
            Structured.render(ast2, new Stream.ASTBuilder(x => stream => x.render(stream))).render(stream2);

            expect(stream2.content).toEqual(stream1.content);
        }));
    });

});