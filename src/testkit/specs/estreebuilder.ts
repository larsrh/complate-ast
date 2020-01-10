import * as Base from "../../ast/base";
import * as ESTree from "estree";
import * as Gen from "../gen";
import * as ESGen from "../esgen";
import {runInNewContext} from "vm";
import {generate} from "astring";
import fc from "fast-check";
import {expressionStatement} from "../../estree/operations";
import {ESTreeBuilder} from "../../jsx/estreebuilder";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import {Builder} from "../../ast/builder";
import {Attributes, AttributeValue} from "../../jsx/syntax";
import {mapObject} from "../../util";
import {compareHTML} from "../dom";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

const exactBuilder = new Structured.ASTBuilder(false);
const exactGen = Gen.defaultAST(exactBuilder);

function evaluate(expr: ESTree.Expression): any {
    // TODO intercept runtime
    const sandbox = { JSXRuntime: _JSXRuntime };
    const statement = expressionStatement(expr);
    const js = generate(statement);
    return runInNewContext(js, sandbox);
}

class ParallelBuilder<A1, A2, P1, P2, AV1, AV2> implements Builder<[A1, A2], [P1, P2], [AV1, AV2]> {
    constructor(
        private readonly builder1: Builder<A1, P1, AV1>,
        private readonly builder2: Builder<A2, P2, AV2>
    ) {}

    attributeValue(value: AttributeValue): [AV1, AV2] {
        return [this.builder1.attributeValue(value), this.builder2.attributeValue(value)];
    }

    element(tag: string, _attributes?: Attributes<[AV1, AV2]>, ...children: [A1, A2][]): [A1, A2] {
        const attributes = _attributes ? _attributes : {};
        return [
            this.builder1.element(tag, mapObject(attributes, tuple => tuple[0]), ...children.map(tuple => tuple[0])),
            this.builder2.element(tag, mapObject(attributes, tuple => tuple[1]), ...children.map(tuple => tuple[1]))
        ];
    }

    prerendered(p: [P1, P2]): [A1, A2] {
        return [this.builder1.prerendered(p[0]), this.builder2.prerendered(p[1])];
    }

    text(text: string): [A1, A2] {
        return [this.builder1.text(text), this.builder2.text(text)];
    }
}

export class Spec<AST extends Base.AST, Forced> {

    constructor(
        public readonly info: Base.ASTInfo<AST, Forced>,
        public readonly treeBuilder: ESTreeBuilder
    ) {}

    private checkEvaluation(ast: Structured.AST, expr: ESTree.Expression): void {
        const result = this.info.force(evaluate(expr));
        // some renderers may reorder attributes; so we have to compare the resulting DOM
        if (this.info.astType === "structured")
            expect(result).toEqual(this.info.force(Structured.render(ast, this.info.builder)));
        else
            compareHTML(this.info.asString(result), Structured.render(ast, Raw.info.builder).value);
    }

    all(name: string): void {
        describe(name, () => {

            it("Emit correctly-typed expressions", () => {
                fc.assert(fc.property(exactGen, ast => {
                    const expr = Structured.render(ast, this.treeBuilder);
                    const result = evaluate(expr);
                    expect(result).toHaveProperty("astType", this.info.astType);
                }));
            });

            it("Evaluate to correct ASTs", () => {
                fc.assert(fc.property(exactGen, ast => {
                    const expr = Structured.render(ast, this.treeBuilder);
                    this.checkEvaluation(ast, expr);
                }));
            });

            it("Evaluate to correct ASTs (simple attribute expressions)", () => {
                const builder = new ParallelBuilder(exactBuilder, this.treeBuilder);
                const gen = Gen.ast(
                    builder,
                    ESGen.attributeValue(ESGen.exprs).map(expr => [expr.value, expr.raw])
                );
                fc.assert(fc.property(gen, input => {
                    const [ast, expr] = input;
                    this.checkEvaluation(ast, expr);
                }));
            });

            it("Evaluate to correct ASTs (prerendered children)", () => {
                const gen = Gen.ast(
                    new Structured.ASTBuilder<Structured.AST>(false),
                    Gen.attr,
                    exactGen
                );
                fc.assert(fc.property(gen, nestedAST => {
                    const flattened = Structured.flatten(nestedAST);
                    const subRendered = Structured.map(nestedAST, ast => Structured.render(ast, this.treeBuilder));
                    const expr = Structured.render(subRendered, this.treeBuilder);
                    this.checkEvaluation(flattened, expr);
                }));
            });

        });
    }

}

export function spec<AST extends Base.AST, Forced>(info: Base.ASTInfo<AST, Forced>, treeBuilder: ESTreeBuilder, name = "Spec"): void {
    new Spec(info, treeBuilder).all(name);
}
