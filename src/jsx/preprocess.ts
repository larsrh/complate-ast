import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../estree/reify";
import * as Operations from "../estree/operations";
import * as Universal from "../ast/universal";
import {JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
import {Builder} from "../ast/builder";
import {Attributes, AttributeValue, isMacro} from "./syntax";
import jsx from "acorn-jsx";
import {Runtime} from "./preprocess/util";

export const acorn = Parser.extend(jsx());

export function extractAST(node: ESTree.Node): Universal.AST | null {
    const richNode = node as any as { _staticAST?: Universal.AST };
    if (richNode._staticAST)
        return richNode._staticAST;
    else
        return null;
}

export function injectAST(node: ESTree.Node, ast: Universal.AST): void {
    (node as any)._staticAST = ast;
}

export abstract class ESTreeBuilder implements Builder<ESTree.Expression, ESTree.Expression, ESTree.Expression> {
    readonly runtime: Runtime;

    constructor(
        readonly canStatic: boolean,
        readonly mode: Universal.Kind,
        runtime?: string
    ) {
        this.runtime = new Runtime(
            Operations.identifier(runtime === undefined ? "JSXRuntime" : runtime),
            mode
        );
    }

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

export function parse(js: string): ESTree.Node {
    return acorn.parse(js) as any as ESTree.Node; // TODO dodgy: version mismatch??
}

export function preprocess(ast: ESTree.Node, builder: ESTreeBuilder): ESTree.Program {
    const compiled = walk(ast, {
        leave(node) {
            // @ts-ignore
            if (node.type === "JSXElement") {
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
                this.replace(builder.macro(builder.runtime.fragment, {}, ...children))
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