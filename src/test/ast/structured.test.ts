import * as Structured from "../../ast/structured";
import * as Stream from "../../ast/stream";
import * as Gen from "../../ast/gen";
import fc from "fast-check";
import {CompactingBuilder} from "../../ast/builders/compact";

describe("Structured AST", () => {

    const builder = Structured.astBuilder;
    const gen = Gen.astWithPrerendered(builder, fc.integer());

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
        const gen = Gen.astWithPrerendered(
            new Structured.ASTBuilder<Structured.AST<never>>(),
            Gen.astNoPrerendered(builder)
        );
        fc.assert(fc.property(gen, ast => {
            const ast1 = Structured.flatten(ast);
            const ast2 = Structured.map(ast, inner => Structured.render(inner, Stream.astBuilderNoPrerender));

            const buffer1 = new Stream.StringBuffer();
            const buffer2 = new Stream.StringBuffer();

            Structured.render(ast1, Stream.astBuilderNoPrerender).render(buffer1);
            Structured.render(ast2, new Stream.ASTBuilder(x => buffer => x.render(buffer))).render(buffer2);

            expect(buffer2.content).toEqual(buffer1.content);
        }));
    });

});