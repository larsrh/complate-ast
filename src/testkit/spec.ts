import * as Base from "../ast/base";
import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import fc, {Arbitrary} from "fast-check";
import * as Gen from "./gen";

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
        return Gen.astNoPrerendered(this.info.builder);
    }

    private asString(ast: AST): string {
        return this.info.asString(this.info.force(ast));
    }

    all(name: string): void {
        describe(name, () => {

            it("Correct AST type", () => {
                fc.assert(fc.property(this.gen, ast => {
                    expect(ast.astType).toEqual(this.info.astType);
                }))
            });

            it("Reference rendering", () => {
                const gen = Gen.astNoPrerendered(exactBuilder).filter(ast => ast.nodeType === "element");
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

        });
    }

}

export function spec<AST extends Base.AST, Forced>(info: Base.ASTInfo<AST, Forced>, name = "Spec"): void {
    new Spec(info).all(name);
}