import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import * as Reify from "../estree/reify";
import {JSXAttribute, JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
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

function macro(expr: ESTree.Expression, attributes: JSXAttribute[], children: ESTree.Expression[]): ESTree.Expression {
    // TODO duplicated code with processAttributes
    const props: (ESTree.Property | ESTree.SpreadElement)[] = attributes.map(attr => {
        switch (attr.type) {
            case "JSXAttribute": {
                const key = Operations.identifier(attr.name.name);
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

                let replacement: ESTree.Expression;
                if (isMacro(tag))
                    replacement = macro(Operations.identifier(tag), attributes, children);
                else
                    replacement = builder.jsxElement(tag, processAttributes(attributes), children);
                this.replace(replacement);
            }
            else if (node.type === "JSXExpressionContainer") {
                const container = node as JSXExpressionContainer;
                this.replace(container.expression as ESTree.Expression);
            }
            else if (node.type === "JSXFragment") {
                const fragment = node as JSXFragment;
                const children = fragment.children as ESTree.Expression[];
                this.replace(macro(runtime.fragmentMacro, [], children));
            }
            else if (node.type === "JSXText") {
                const text = node as JSXText;
                const normalized = normalizeWhitespace(text.value);
                if (normalized === "")
                    this.remove();
                else
                    this.replace(Reify.string(normalized));
            }
        }
    }) as ESTree.Node;
}