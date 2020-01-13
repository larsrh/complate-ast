import * as Gen from "../../../testkit/gen";
import * as Structured from "../../../ast/structured";
import * as Raw from "../../../ast/raw";
import * as Stream from "../../../ast/stream";
import fc from "fast-check";
import {ZipBuilder} from "../../../ast/builders/zip";

describe("Zip builder", () => {

    it("Equivalence", () => {
        const gen = Gen.ast(
            new Structured.ASTBuilder<[string, string]>(),
            Gen.attr,
            fc.tuple(fc.string(), fc.string())
        );
        fc.assert(fc.property(gen, ast => {
            const builder1 = new Raw.ASTBuilder();
            const builder2 = new Stream.ASTBuilder<string>(s => buffer => buffer.write(s));
            const zip = new ZipBuilder(builder1, builder2);
            const [ast1, ast2] = Structured.render(ast, zip);
            expect(ast1).toEqual(Structured.render(Structured.map(ast, t => t[0]), builder1));
            expect(Stream.force(ast2)).toEqual(Stream.force(Structured.render(Structured.map(ast, t => t[1]), builder2)));
        }));
    });

});