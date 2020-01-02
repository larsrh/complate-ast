import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import * as Stream from "../../ast/stream";
import * as Gen from "../../ast/gen";
import fc from "fast-check";

describe("Raw AST", () => {

    const builder = Structured.astBuilder;
    const gen = Gen.astNoPrerendered(builder);

    it("Equivalent to Stream", () => {
        fc.assert(fc.property(gen, ast => {
            const raw = Structured.render(ast, Raw.astBuilder);
            const buffer = new Stream.StringBuffer();
            Structured.render(ast, Stream.astBuilder).render(buffer);
            expect(raw.value).toEqual(buffer.content);
        }));
    });

    it("Void element", () => {
        const raw = Structured.render(Structured.astBuilder.element("br"), Raw.astBuilder);
        expect(raw.value).toEqual("<br>");
    });

});
