import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../js/reify";
import * as Universal from "./universal";
import * as Structured from "./structured";
import * as Raw from "./raw";
import {JSXElement, JSXExpressionContainer, JSXText} from "../js/jsx";
import _ from "lodash";
import * as Util from "../util";

// TODO use import
const jsx = require("acorn-jsx");

export const acorn = Parser.extend(jsx());

export function extractAST(node: ESTree.Node): Universal.AST | null {
    const richNode = node as any as { _static_ast?: Universal.AST };
    if (richNode._static_ast)
        return richNode._static_ast;
    else
        return null;
}

function injectAST(node: ESTree.Node, ast: Universal.AST) {
    (node as any)._static_ast = ast;
}

// not exactly a `Builder` to ensure stronger type safety
class ExpressionBuilder {
    constructor(
        private readonly mode: Universal.Kind
    ) {}

    element(
        tag: string,
        attributes: Map<string, ESTree.BaseExpression>,
        children: ESTree.BaseExpression[]
    ): ESTree.Node {
        const isStatic =
            _.every(children, '_static_ast') &&
            // needs to be converted to array because lodash does weird things otherwise
            _.every([...attributes.values()], { type: "Literal" });

        let staticAttributes: object | null;
        let staticChildren: Universal.AST[] | null;
        if (isStatic) {
            staticAttributes = Object.fromEntries([...attributes.entries()].map(entry => {
                const [key, value] = entry;
                return [key, (value as ESTree.Literal).value];
            }));
            staticChildren = children.map(child => extractAST(child as ESTree.Node)!);
        }

        function adaptChild(child: ESTree.BaseExpression, all?: boolean): ESTree.Expression {
            if (child.type === "JSXExpressionContainer" || all) {
                const content =
                    child.type === "JSXExpressionContainer" ?
                        (child as JSXExpressionContainer).expression :
                        child as ESTree.Expression;

                // this can be anything: text or more elements, so we have to wrap it in prerendered
                return Reify.object(new Map<string, ESTree.Expression>([
                    ["astType", Reify.string("structured")],
                    ["nodeType", Reify.string("prerendered")],
                    ["content", content]
                ]));
            }
            if (child.type === "ObjectExpression") {
                // we have already processed this
                return child as ESTree.ObjectExpression;
            }

            throw new Error(`Unknown expression type: ${child.type}`);
        }

        function adaptAttribute(expr: ESTree.BaseExpression): ESTree.Expression {
            if (expr.type === "Literal")
                return expr as ESTree.Literal;
            // @ts-ignore
            if (expr.type === "JSXExpressionContainer")
                return (expr as any as JSXExpressionContainer).expression;
            throw new Error(`Unknown attribute type: ${expr.type}`);
        }

        function makeStructured(all?: boolean): ESTree.Expression {
            return Reify.object(new Map<string, ESTree.Expression>([
                ["astType", Reify.string("structured")],
                ["nodeType", Reify.string("element")],
                ["tag", Reify.string(tag)],
                ["attributes", Reify.object(Util.mapValues(attributes, adaptAttribute))],
                ["children", Reify.array(children.map(child => adaptChild(child, all)))]
            ]));
        }

        if (this.mode === "structured") {
            const node = makeStructured();

            if (isStatic) {
                if (!_.every(staticChildren!, { astType: "structured" }))
                    throw new Error("Bug: structured node contains static, non-structured children");

                const ast = Structured.astBuilder.element(
                    tag,
                    staticAttributes!,
                    ...(staticChildren! as Structured.AST<never>[])
                );
                injectAST(node, ast);
            }

            return node;
        }
        else if (this.mode === "stream") {
            throw new Error("unsupported");
        }
        else { // raw
            if (isStatic) {
                if (!_.every(staticChildren!, { astType: "raw" }))
                    throw new Error("Bug: raw node contains static, non-raw children");

                const ast = Raw.astBuilder.element(
                    tag,
                    staticAttributes!,
                    ...(staticChildren! as Raw.AST[])
                );
                const node = Reify.any(ast);
                injectAST(node, ast);
                return node;
            }
            else {
                // need to fall back to structured node
                return makeStructured(true);
            }
        }
    }

    text(text: string): ESTree.Node {
        if (this.mode === "structured") {
            const ast = Structured.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
        else if (this.mode === "stream") {
            throw new Error("unsupported");
        }
        else { // raw
            const ast = Raw.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
    }

}

export function parse(js: string): ESTree.Node {
    return acorn.parse(js) as any as ESTree.Node; // TODO dodgy: version mismatch??
}

export function preprocess(ast: ESTree.Node, mode: Universal.Kind): ESTree.Program {
    const builder = new ExpressionBuilder(mode);
    const compiled = walk(ast, {
        enter(node, parent, prop, index) {
        },
        leave(node, parent, prop, index) {
            // @ts-ignore
            if (node.type === "JSXElement") {
                const element = node as any as JSXElement;
                const tag = element.openingElement.name.name;
                const attributes = new Map<string, ESTree.BaseExpression>(
                    element.openingElement.attributes.map(attr =>
                        [attr.name.name, attr.value as ESTree.BaseExpression]
                    )
                );
                const children = element.children;
                this.replace(builder.element(tag, attributes, children));
            }
            // @ts-ignore
            else if (node.type === "JSXText") {
                const text = node as any as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    });
    return compiled as ESTree.Program;
}