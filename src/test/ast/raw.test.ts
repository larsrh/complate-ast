import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import * as Stream from "../../ast/stream";
import * as Gen from "../../testkit/gen";
import fc from "fast-check";

describe("Raw AST", () => {

    const builder = Structured.info.builder;
    const gen = Gen.astNoPrerendered(builder);

    it("Equivalent to Stream", () => {
        fc.assert(fc.property(gen, ast => {
            const raw = Structured.render(ast, Raw.info.builder);
            const stream = Stream.force(Structured.render(ast, Stream.info.builder));
            expect(raw.value).toEqual(stream);
        }));
    });

    it("Void element", () => {
        const raw = Structured.render(Structured.info.builder.element("br"), Raw.info.builder);
        expect(raw.value).toEqual("<br>");
    });

});
