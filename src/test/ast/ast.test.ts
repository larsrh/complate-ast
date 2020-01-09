import * as Structured from "../../ast/structured";
import * as Stream from "../../ast/stream";
import * as Raw from "../../ast/raw";
import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {addItems} from "../../ast";
import {AST, ASTInfo} from "../../ast/base";

const elementGen = Gen.astNoPrerendered(Structured.info.builder).filter(t => t.nodeType === "element");
const childrenGen = fc.array(Gen.astNoPrerendered(Structured.info.builder), 0, 5);

function laws<T extends AST, F>(info: ASTInfo<T, F>): void {
    function make(ast: Structured.AST): T {
        return Structured.render(ast, info.builder);
    }

    describe(`Kind: ${info.astType}`, () => {

        it("Identity", () => {
            fc.assert(fc.property(elementGen.map(make), ast => {
                expect(info.force(addItems(ast))).toEqual(info.force(ast));
                expect(info.force(addItems(ast, {}))).toEqual(info.force(ast));
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
                expect(info.force(ast2)).toEqual(info.force(ast1));
            }));
        });

    });
}

describe("AST", () => {

    describe("Introspection", () => {

        it("Stream/Structured equivalence", () => {
            const gen = fc.tuple(elementGen, Gen.attrs, childrenGen);
            fc.assert(fc.property(gen, params => {
                const [baseStructured, attrs, childrenStructured] = params;
                const baseStream = Structured.render(baseStructured, Stream.info.builder);
                const childrenStream = childrenStructured.map(ast => Structured.render(ast, Stream.info.builder));
                const targetStructured = addItems(baseStructured, attrs, ...childrenStructured);
                const targetStream = addItems(baseStream, attrs, ...childrenStream);
                expect(Stream.force(targetStream)).toEqual(Structured.render(targetStructured, Raw.info.builder).value);
            }));
        });

        describe("Laws", () => {

            laws(Structured.info);
            laws(Stream.info);

        });

        it("Accepts string children", () => {
            const builder = Structured.info.builder;
            const ast1 = builder.element("span");
            const ast2 = addItems(ast1, {}, "hi");
            expect(ast2).toEqual(builder.element("span", {}, builder.text("hi")));
        });

    });

});

