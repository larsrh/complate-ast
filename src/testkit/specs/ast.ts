import * as Base from "../../ast/base";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import fc, {Arbitrary} from "fast-check";
import * as Gen from "../gen";
import {addItems} from "../../ast";

const exactBuilder = new Structured.ASTBuilder(false);

interface RenderExample {
    ast: Structured.AST;
    expected: string;
}

const renderExamples: Record<string, RenderExample> = {
    "Attributes": {
        ast: exactBuilder.element("button", { disabled: true, class: null, id: undefined, "data-foo": false, "data-bar": "<>\"", "data-test": "test" }),
        expected: `<button disabled data-bar="&lt;&gt;&quot;" data-test="test"></button>`
    },
    "Children": {
        ast: exactBuilder.element("div", {}, exactBuilder.text("1"), exactBuilder.element("span"), exactBuilder.text("2")),
        expected: `<div>1<span></span>2</div>`
    },
    "Void": {
        ast: exactBuilder.element("br"),
        expected: `<br>`
    }
};

export class Spec<AST extends Base.AST, Forced> {

    constructor(
        public readonly info: Base.ASTInfo<AST, Forced>
    ) {}

    get gen(): Arbitrary<AST> {
        return Gen.defaultAST(this.info.builder);
    }

    private asString(ast: AST): string {
        return this.info.asString(this.info.force(ast));
    }

    private introspection(): void {
        const _addItems = this.info.introspection!.addItems;
        const elementGen = Gen.defaultAST(exactBuilder).filter(ast => ast.nodeType === "element");
        const childrenGen = fc.array(Gen.defaultAST(exactBuilder), 0, 5);
        const make: (ast: Structured.AST) => AST = ast => Structured.render(ast, this.info.builder);

        describe("Introspection", () => {

            it("Identity", () => {
                fc.assert(fc.property(elementGen.map(make), ast => {
                    expect(this.info.force(_addItems(ast, {}, []))).toEqual(this.info.force(ast));
                }));
            });

            it("Composition", () => {
                const gen = fc.tuple(
                    elementGen.map(make),
                    Gen.defaultAttrs,
                    childrenGen.map(children => children.map(make)),
                    Gen.defaultAttrs,
                    childrenGen.map(children => children.map(make))
                );
                fc.assert(fc.property(gen, params => {
                    const [base, attrs1, children1, attrs2, children2] = params;
                    const ast1 = _addItems(_addItems(base, attrs1, children1), attrs2, children2);
                    const ast2 = _addItems(base, {...attrs1, ...attrs2}, [...children1, ...children2]);
                    expect(this.info.force(ast2)).toEqual(this.info.force(ast1));
                }));
            });

            it("Accepts string children", () => {
                const ast1 = this.info.builder.element("span");
                const ast2 = addItems(ast1, {}, "hi");
                const expected = this.info.builder.element("span", {}, this.info.builder.text("hi"));
                expect(this.info.force(ast2)).toEqual(this.info.force(expected));
            });

            it("Throws on non-elements", () => {
                const text = this.info.builder.text("text");
                expect(() => this.info.force(_addItems(text, {}, []))).toThrow();
            });

            it("Throws for void elements", () => {
                const element = this.info.builder.element("br");
                const text = this.info.builder.text("text");
                expect(() => this.info.force(_addItems(element, {}, [text]))).toThrow();
            });

            it("Reference", () => {
                const gen = fc.tuple(
                    elementGen,
                    Gen.defaultAttrs,
                    childrenGen,
                );
                fc.assert(fc.property(gen, params => {
                    const [_base, attrs, children] = params;
                    const base = _base as Structured.ElementNode<never>;
                    const ast1 = exactBuilder.element(base.tag, {...base.attributes, ...attrs}, ...base.children, ...children);
                    const ast2 = _addItems(make(base), attrs, children.map(make));
                    expect(this.asString(ast2)).toEqual(Structured.info.asString(ast1));
                }));
            });

        });

    }

    all(name: string): void {
        describe(name, () => {

            it("Correct AST kind", () => {
                fc.assert(fc.property(this.gen, ast => {
                    expect(ast.astKind).toEqual(this.info.astKind);
                }))
            });

            it("Reference rendering", () => {
                const gen = Gen.defaultAST(exactBuilder).filter(ast => ast.nodeType === "element");
                fc.assert(fc.property(gen, ast => {
                    const target = Structured.render(ast, this.info.builder);
                    const reference = Structured.render(ast, Raw.info.builder);
                    expect(this.asString(target)).toEqual(reference.value);
                }));
            });

            describe("Rendering examples", () => {

                it.each(Object.keys(renderExamples))(`%s`, key => {
                    const example = renderExamples[key];
                    const target = Structured.render(example.ast, this.info.builder);
                    expect(this.asString(target)).toEqual(example.expected);
                });

            });

            it("Disallows dynamic tags", () => {
                expect(() => this.info.builder.element("$test")).toThrow();
            });

            it("Disallows macro tags", () => {
                expect(() => this.info.builder.element("Test")).toThrow();
            });

            it("Disallows children in void tags", () => {
                expect(() => this.info.builder.element("br", {}, this.info.builder.text("no"))).toThrow();
            });

            if (this.info.introspection)
                this.introspection();
            else
                it("Does not support introspection", () => {
                    fc.assert(fc.property(this.gen, ast => {
                        expect(() => addItems(ast)).toThrow(/does not support/);
                    }));
                });

        });
    }

}

export function spec<AST extends Base.AST, Forced>(info: Base.ASTInfo<AST, Forced>, name = "Spec"): void {
    new Spec(info).all(name);
}