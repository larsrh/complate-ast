import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import {JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
import {isMacro} from "./syntax";
import jsx from "acorn-jsx";
import {processAttributes} from "./estreebuilders/util";
import {ESTreeBuilder} from "./estreebuilder";

export const acorn = Parser.extend(jsx());

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
                const replacement = builder.elementOrMacro(
                    isMacro(tag) ? Operations.identifier(tag) : tag,
                    processAttributes(attributes),
                    children
                );
                this.replace(replacement);
            }
            else if (node.type === "JSXExpressionContainer") {
                const container = node as JSXExpressionContainer;
                this.replace(container.expression as ESTree.Expression);
            }
            else if (node.type === "JSXFragment") {
                const fragment = node as JSXFragment;
                const children = fragment.children as ESTree.Expression[];
                this.replace(builder.elementOrMacro(
                    builder.runtime.fragmentMacro,
                    processAttributes([]),
                    children
                ));
            }
            else if (node.type === "JSXText") {
                const text = node as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    }) as ESTree.Node;
}