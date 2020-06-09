import * as Base from "../../ast/base";
import * as ESTree from "estree-jsx";
import * as Gen from "../gen";
import * as ESGen from "../esgen";
import {runInNewContext} from "vm";
import {generate} from "astring";
import fc from "fast-check";
import {expressionStatement} from "../../syntax/operations";
import {ESTreeBuilder} from "../../preprocess/estreebuilder";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import {compareHTML} from "../dom";
import {zipBuilders} from "../../ast/builders/zip";
import {CompactingBuilder} from "../../ast/builders/compact";
import * as JSXRuntime from "../../runtime";

const exactBuilder = new Structured.ASTBuilder(false);
const exactGen = Gen.defaultAST(exactBuilder);

export class Spec<AST extends Base.AST, Forced> {

    constructor(
        public readonly info: Base.ASTInfo<AST, Forced>,
        public readonly treeBuilder: ESTreeBuilder
    ) {}

    private evaluate(expr: ESTree.Expression, strict = false): any {
        const sandbox = strict && this.treeBuilder.canStatic ? {} : JSXRuntime;
        const statement = expressionStatement(expr);
        const js = generate(statement);
        return runInNewContext(js, sandbox);
    }

    private checkEvaluation(ast: Structured.AST, expr: ESTree.Expression, strict = false): void {
        const result = this.info.force(this.evaluate(expr, strict));
        // some renderers may reorder attributes; so we have to compare the resulting DOM
        if (this.info.astKind === "structured" || strict)
            expect(result).toEqual(this.info.force(Structured.render(ast, this.info.builder)));
        else
            compareHTML(this.info.asString(result), Structured.render(ast, Raw.info().builder).value);
    }

    all(name: string): void {
        describe(name, () => {

            it("Emit correctly-typed expressions", () => {
                fc.assert(fc.property(exactGen, ast => {
                    const expr = Structured.render(ast, this.treeBuilder);
                    const result = this.evaluate(expr);
                    expect(result).toHaveProperty("astKind", this.info.astKind);
                }));
            });

            /*
             * structured AST (exact) -----[render]--> target AST
             *       |
             *       | [render/treeBuilder]               ===
             *       v
             *    ESTree    ---------------[eval]----> target AST
             */
            it("Evaluate to correct ASTs", () => {
                fc.assert(fc.property(exactGen, ast => {
                    const expr = Structured.render(ast, this.treeBuilder);
                    this.checkEvaluation(ast, expr, true);
                    if (this.treeBuilder.canStatic) {
                        const normalized = Structured.render(ast, new CompactingBuilder({
                            children: false,
                            attributes: true,
                            trueAttributes: false
                        }));
                        expect(expr).toHaveProperty("_staticAST", normalized);
                    }
                }));
            });

            it("Evaluate to correct ASTs (attribute expressions and prerendered children)", () => {
                const builder = zipBuilders(
                    new Structured.ASTBuilder<Structured.AST>(false),
                    this.treeBuilder
                );
                const gen = Gen.ast(
                    builder,
                    ESGen.attributeValue(ESGen.exprs).map(expr => [expr.value, expr.raw]),
                    exactGen.map(ast => [ast, Structured.render(ast, this.treeBuilder)])
                );
                fc.assert(fc.property(gen, input => {
                    const [ast, expr] = input;
                    const flattened = Structured.flatten(ast);
                    this.checkEvaluation(flattened, expr);
                }))
            });
        });
    }

}

export function spec<AST extends Base.AST, Forced>(info: Base.ASTInfo<AST, Forced>, treeBuilder: ESTreeBuilder, name = "Spec"): void {
    new Spec(info, treeBuilder).all(name);
}
