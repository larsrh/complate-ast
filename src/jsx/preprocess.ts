import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../estree/reify";
import * as Operations from "../estree/operations";
import * as Structured from "../ast/structured";
import {JSXAttribute, JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
import {Attributes, AttributeValue, isMacro} from "./syntax";
import jsx from "acorn-jsx";
import {Builder} from "../ast/builder";

export const acorn = Parser.extend(jsx());

export interface RichNode extends ESTree.BaseNode {
    _staticAST: Structured.AST;
}

export function hasAST(node: ESTree.BaseNode): node is RichNode {
    return (node as any)._staticAST;
}

export function extractAST(node: ESTree.BaseNode): Structured.AST | null {
    if (hasAST(node))
        return node._staticAST;
    else
        return null;
}

export function injectAST(node: ESTree.Node, ast: Structured.AST): void {
    (node as RichNode)._staticAST = ast;
}

export abstract class ESTreeBuilder implements Builder<ESTree.Expression, ESTree.Expression, ESTree.Expression> {
    constructor(
        readonly canStatic: boolean,
        readonly fragment: ESTree.Expression
    ) {}

    abstract elementOrMacro(
        tag: string | ESTree.Expression,
        attributes: JSXAttribute[],
        children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract text(text: string): ESTree.Expression;

    prerendered(p: ESTree.Expression): ESTree.Expression {
        return p;
    }

    attributeValue(key: string, value: AttributeValue): ESTree.Expression {
        return Reify.any(value);
    }

    element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        // TODO untested??
        throw 0;
    }

}

export function parse(js: string): ESTree.BaseNode {
    return acorn.parse(js);
}

export function preprocess(ast: ESTree.BaseNode, builder: ESTreeBuilder): ESTree.Node {
    return walk(ast, {
        leave(node) {
            // <https://github.com/acornjs/acorn-jsx/issues/105>
            if (node.type === "Literal") {
                const literal = node as ESTree.Literal;
                if (literal.raw !== undefined)
                    this.replace(Object.assign({}, node, { raw: undefined }));
            }
            else if (node.type === "JSXElement") {
                const element = node as JSXElement;
                const tag = element.openingElement.name.name;
                const attributes = element.openingElement.attributes;
                const children = element.children as ESTree.Expression[];
                const replacement = builder.elementOrMacro(isMacro(tag) ? Operations.identifier(tag) : tag, attributes, children);
                this.replace(replacement);
            }
            else if (node.type === "JSXExpressionContainer") {
                const container = node as JSXExpressionContainer;
                this.replace(container.expression as ESTree.Expression);
            }
            else if (node.type === "JSXFragment") {
                const fragment = node as JSXFragment;
                const children = fragment.children as ESTree.Expression[];
                this.replace(builder.elementOrMacro(builder.fragment, [], children))
            }
            else if (node.type === "JSXText") {
                const text = node as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    }) as ESTree.Node;
}