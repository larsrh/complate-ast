import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../estree/reify";
import * as Operations from "../estree/operations";
import * as Structured from "../ast/structured";
import {JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
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

    abstract element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract text(text: string): ESTree.Expression;

    prerendered(p: ESTree.Expression): ESTree.Expression {
        return p;
    }

    attributeValue(key: string, value: AttributeValue): ESTree.Expression {
        return Reify.any(value);
    }
}

export function parse(js: string): ESTree.BaseNode {
    return acorn.parse(js);
}

export function preprocess(ast: ESTree.BaseNode, builder: ESTreeBuilder): ESTree.Node {
    // <https://github.com/Rich-Harris/estree-walker/pull/17>
    return walk(ast as ESTree.Node, {
        leave(node) {
            // <https://github.com/acornjs/acorn-jsx/issues/105>
            if (node.type === "Literal") {
                if (node.raw !== undefined)
                    this.replace(Object.assign({}, node, { raw: undefined }));
            }
            // @ts-ignore
            else if (node.type === "JSXElement") {
                const element = node as any as JSXElement;
                const tag = element.openingElement.name.name;
                const attributes = Object.fromEntries(
                    element.openingElement.attributes.map(attr =>
                        [attr.name.name, attr.value as ESTree.Expression]
                    )
                );
                const children = element.children as ESTree.Expression[];
                const replacement =
                    isMacro(tag) ?
                        builder.macro(Operations.identifier(tag), attributes, ...children) :
                        builder.element(tag, attributes, ...children);
                this.replace(replacement);
            }
            // @ts-ignore
            else if (node.type === "JSXExpressionContainer") {
                const container = node as any as JSXExpressionContainer;
                this.replace(container.expression);
            }
            // @ts-ignore
            else if (node.type === "JSXFragment") {
                const fragment = node as any as JSXFragment;
                const children = fragment.children as ESTree.Expression[];
                this.replace(builder.macro(builder.fragment, {}, ...children))
            }
            // @ts-ignore
            else if (node.type === "JSXText") {
                const text = node as any as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    });
}