import * as Universal from "../../ast/universal";
import * as Structured from "../../ast/structured";
import * as Stream from "../../ast/stream";
import * as Raw from "../../ast/raw";
import * as Gen from "../../ast/gen";
import fc from "fast-check";
import {addItems} from "../../ast/introspection";

const elementGen = Gen.astNoPrerendered(Structured.astBuilder).filter(t => t.nodeType === "element");
const childrenGen = fc.array(Gen.astNoPrerendered(Structured.astBuilder), 0, 5);

function laws<AST extends Universal.AST>(
    kind: Universal.Kind,
    make: (ast: Structured.AST) => AST,
    force: (ast: AST) => any
): void {
    describe(`Kind: ${kind}`, () => {

        it("Identity", () => {
            fc.assert(fc.property(elementGen.map(make), ast => {
                expect(force(addItems(ast))).toEqual(force(ast));
                expect(force(addItems(ast, {}))).toEqual(force(ast));
            }));
        });

        it("Composition", () => {
            const gen = fc.tuple(
                elementGen.map(make),
                Gen.attrs,
                childrenGen.map(children => children.map(make)),
                Gen.attrs,
                childrenGen.map(children => children.map(make))
            );
            fc.assert(fc.property(gen, params => {
                const [base, attrs1, children1, attrs2, children2] = params;
                const ast1 = addItems(addItems(base, attrs1, ...children1), attrs2, ...children2);
                const ast2 = addItems(base, {...attrs1, ...attrs2}, ...children1, ...children2);
                expect(force(ast2)).toEqual(force(ast1));
            }));
        });

    });
}

describe("Introspection", () => {

    it("Stream/Structured equivalence", () => {
        const gen = fc.tuple(elementGen, Gen.attrs, childrenGen);
        fc.assert(fc.property(gen, params => {
            const [baseStructured, attrs, childrenStructured] = params;
            const baseStream = Structured.render(baseStructured, Stream.astBuilderNoPrerender);
            const childrenStream = childrenStructured.map(ast => Structured.render(ast, Stream.astBuilderNoPrerender));
            const targetStructured = addItems(baseStructured, attrs, ...childrenStructured);
            const targetStream = addItems(baseStream, attrs, ...childrenStream);
            expect(Stream.force(targetStream)).toEqual(Structured.render(targetStructured, Raw.astBuilder).value);
        }));
    });

    describe("Laws", () => {

        laws("structured", ast => ast, ast => ast);
        laws("stream", ast => Structured.render(ast, Stream.astBuilderNoPrerender), Stream.force);

    });

    it("Accepts string children", () => {
        const ast1 = Structured.astBuilder.element("span");
        const ast2 = addItems(ast1, {}, "hi");
        expect(ast2).toEqual(Structured.astBuilder.element("span", {}, Structured.astBuilder.text("hi")));
    });

});