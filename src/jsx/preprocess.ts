import {walk} from "estree-walker";
import * as ESTree from "estree-jsx";
import {Node} from "estree";
import * as Operations from "../estree/operations";
import * as Reify from "reify-to-estree";
import {isMacro} from "./syntax";
import {processAttributes} from "./estreebuilders/util";
import {ESTreeBuilder} from "./estreebuilder";
import {importStatement, RuntimeConfig, runtimeModuleFromConfig} from "./runtime";

// Implementation copied from babel
// Copyright (c) 2014-present Sebastian McKenzie and other contributors, MIT license
// <https://github.com/babel/babel/blob/e7961a08a839b0bfe2c5a08f2e1c7e3d436af144/packages/babel-types/src/utils/react/cleanJSXElementLiteralChild.js>
export function normalizeWhitespace(text: string): string {
    const lines = text.split(/\r\n|\n|\r/);

    let lastNonEmptyLine = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/[^ \t]/)) {
            lastNonEmptyLine = i;
        }
    }

    let str = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const isFirstLine = i === 0;
        const isLastLine = i === lines.length - 1;
        const isLastNonEmptyLine = i === lastNonEmptyLine;

        // replace rendered whitespace tabs with spaces
        let trimmedLine = line.replace(/\t/g, " ");

        // trim whitespace touching a newline
        if (!isFirstLine) {
            trimmedLine = trimmedLine.replace(/^[ ]+/, "");
        }

        // trim whitespace touching an endline
        if (!isLastLine) {
            trimmedLine = trimmedLine.replace(/[ ]+$/, "");
        }

        if (trimmedLine) {
            if (!isLastNonEmptyLine) {
                trimmedLine += " ";
            }

            str += trimmedLine;
        }
    }

    return str;
}

function macro(expr: ESTree.Expression, attributes: (ESTree.JSXAttribute | ESTree.JSXSpreadAttribute)[], children: ESTree.Expression[]): ESTree.Expression {
    // TODO duplicated code with processAttributes
    const props: (ESTree.Property | ESTree.SpreadElement)[] = attributes.map(attr => {
        switch (attr.type) {
            case "JSXAttribute": {
                const key = Operations.identifier((attr.name as ESTree.JSXIdentifier).name);
                const value = (attr.value as ESTree.Expression | null) || Reify.boolean(true);
                return {
                    type: "Property",
                    method: false,
                    shorthand: false,
                    computed: false,
                    key: key,
                    value: value,
                    kind: "init"
                }
            }
            case "JSXSpreadAttribute":
                return {
                    type: "SpreadElement",
                    argument: attr.argument as ESTree.Expression
                };
        }
    });

    return Operations.call(expr, Operations.object(...props), ...children);
}

export function preprocess(
    ast: ESTree.BaseNode,
    builder: ESTreeBuilder,
    config: RuntimeConfig
): Node {
    // TODO pass to builder?
    const runtime = runtimeModuleFromConfig(config);

    return walk(ast, {
        leave(_node) {
            const node = _node as ESTree.Node;
            // <https://github.com/acornjs/acorn-jsx/issues/105>
            if (node.type === "Literal") {
                if (node.raw !== undefined) {
                    const replacement = { ...node, raw: undefined };
                    this.replace(replacement);
                }
            }
            else if (node.type === "Program" && config.importPath) {
                const replacement = { ...node, body: [importStatement(config), ...node.body] };
                this.replace(replacement);
            }
            else if (node.type === "JSXElement") {
                const tag = (node.openingElement.name as ESTree.JSXIdentifier).name;
                const attributes = node.openingElement.attributes;
                const children = node.children as any[];

                let replacement: ESTree.Expression;
                if (isMacro(tag))
                    replacement = macro(Operations.identifier(tag), attributes, children);
                else
                    replacement = builder.jsxElement(tag, processAttributes(attributes), children);
                this.replace(replacement);
            }
            else if (node.type === "JSXExpressionContainer") {
                this.replace(node.expression);
            }
            else if (node.type === "JSXFragment") {
                const children = node.children as any[];
                this.replace(macro(runtime.fragmentMacro, [], children));
            }
            else if (node.type === "JSXText") {
                const normalized = normalizeWhitespace(node.value);
                if (normalized === "")
                    this.remove();
                else
                    this.replace(Reify.string(normalized));
            }
        }
    }) as Node;
}