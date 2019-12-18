import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../js/reify";
import * as Universal from "./universal";
import * as Structured from "./structured";
import * as Raw from "./raw";
import {JSXElement, JSXExpression, JSXExpressionContainer, JSXText} from "../js/jsx";
import _ from "lodash";

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
        attributes: Map<string, ESTree.Expression>,
        children: JSXExpression[]
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

        if (this.mode === "structured") {
            const node = Reify.object(new Map<string, ESTree.Expression>([
                ["nodeType", Reify.string("element")],
                ["astType", Reify.string("structured")],
                ["tag", Reify.string(tag)],
                ["attributes", Reify.object(attributes)],
                ["children", Reify.array(children as ESTree.Expression[])]
            ]));

            if (isStatic) {
                if (!_.every(staticChildren!, { astType: "structured" }))
                    throw new Error("Bug: structured mode contains non-structured children");

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
            throw new Error("unsupported");
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
                const attributes = new Map<string, ESTree.Expression>(
                    element.openingElement.attributes.map(attr =>
                        [attr.name.name, attr.value as ESTree.Expression]
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
            // @ts-ignore
            else if (node.type === "JSXExpressionContainer") {
                // JSX expression containers can appear as attribute values (x = {y}) and in children
                // we strip this out, which _may_ result in invalid code if there's a bug lurking somewhere
                // but escodegen refuses to serialize any JSX expressions, so this is safe:
                // in case of a bug, escodegen will blow up
                const container = node as any as JSXExpressionContainer;
                this.replace(container.expression);
            }
        }
    });
    return compiled as ESTree.Program;
}