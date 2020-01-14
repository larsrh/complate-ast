import {Options, Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import {JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
import {isMacro} from "./syntax";
import jsx from "acorn-jsx";
import {processAttributes} from "./estreebuilders/util";
import {ESTreeBuilder} from "./estreebuilder";
import {importStatement, RuntimeConfig, runtimeModuleFromConfig} from "./runtime";

export const acorn = Parser.extend(jsx());

export function parse(js: string, options?: Options): ESTree.BaseNode {
    return acorn.parse(js, options);
}

export function preprocess(
    ast: ESTree.BaseNode,
    builder: ESTreeBuilder,
    config: RuntimeConfig
): ESTree.Node {
    // TODO pass to builder?
    const runtime = runtimeModuleFromConfig(config);

    return walk(ast, {
        leave(node) {
            // <https://github.com/acornjs/acorn-jsx/issues/105>
            if (node.type === "Literal") {
                const literal = node as ESTree.Literal;
                if (literal.raw !== undefined) {
                    const replacement = { ...literal, raw: undefined };
                    this.replace(replacement);
                }
            }
            else if (node.type === "Program" && config.importPath) {
                const program = node as ESTree.Program;
                const replacement = { ...program, body: [importStatement(config), ...program.body] };
                this.replace(replacement);
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
                    runtime.fragmentMacro,
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