import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import * as Stream from "../ast/stream";
import {genNoPrerendered} from "../ast/gen";
import fc from "fast-check";
import {StringStream} from "../stream";

describe("Raw AST", () => {

    const builder = Structured.astBuilder;
    const gen = genNoPrerendered(builder);

    it("Equivalent to Stream", () => {
        fc.assert(fc.property(gen, ast => {
            const raw = Structured.render(ast, Raw.astBuilder);
            const stream = new StringStream();
            Structured.render(ast, Stream.astBuilder).render(stream);
            expect(raw.value).toEqual(stream.content);
        }));
    })

});
