import * as Structured from "../../ast/structured";
import * as Stream from "../../ast/stream";
import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {CompactingBuilder} from "../../ast/builders/compact";
import {spec} from "../../testkit/specs/ast";
import {structuredText} from "../../ast/_text";

describe("Structured AST", () => {

    spec(Structured.info(), structuredText);
    spec({ ...Structured.info(), builder: new Structured.ASTBuilder(false) }, structuredText, "Spec (exact builder)");

    const gen = Gen.ast(new Structured.ASTBuilder<number>(), Gen.attr, fc.integer());

    it("map(identity)", () => {
        fc.assert(fc.property(gen, ast => {
            const ast2 = Structured.map(ast, x => x);
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
        const gen = Gen.ast(
            new Structured.ASTBuilder<Structured.AST>(),
            Gen.attr,
            Gen.defaultAST(Structured.info().builder)
        );
        fc.assert(fc.property(gen, ast => {
            const ast1 = Structured.flatten(ast);
            const ast2 = Structured.map(ast, inner => Structured.render(inner, Stream.info().builder));

            const result1 = Stream.force(Structured.render(ast1, Stream.info().builder));
            const result2 = Stream.force(Structured.render(ast2, new Stream.ASTBuilder(x => buffer => x.render(buffer))));

            expect(result2).toEqual(result1);
        }));
    });

});