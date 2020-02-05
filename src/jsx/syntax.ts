import {filterObject, mapObject} from "../util";

export type Attributes<AV = AttributeValue> = Record<string, AV>;
export type AttributeValue = string | boolean | null | undefined;

export function escapeHTML(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

export function isMacro(tag: string): boolean {
    return /^[A-Z]/.test(tag);
}

export function isDynamic(tag: string): boolean {
    return tag.charAt(0) === '$';
}

export const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "keygen",
    "link", "meta", "param", "source", "track", "wbr"
]);

export function isVoidElement(s: string): boolean {
    return voidElements.has(s);
}

export function normalizeAttribute(value: AttributeValue): string | true | null {
    if (value === true)
        return value;
    else if (value === null || value === undefined || value === false)
        return null;
    else if (typeof value === "string")
        return value;
    else
        // in TypeScript-typed calls this can't happen
        return `${value}`;
}

export function normalizeAttributes(attrs?: Attributes): Attributes<string | true> {
    return attrs ? filterObject(mapObject(attrs, value => normalizeAttribute(value))) : {};
}

export function renderAttributes(attrs?: Attributes): string {
    const normalized = normalizeAttributes(attrs);

    let result = "";
    for (const [key, value] of Object.entries(normalized)) {
        result += " ";
        result += key;
        if (value !== true) {
            result += "=\"";
            result += escapeHTML(value);
            result += "\"";
        }
    }

    return result;
}

export class HTMLString {
    constructor(
        readonly content: string
    ) {}
}

export type TextBuilder<AST> = (text: string, escape: boolean) => AST;

export function normalizeChildren<AST>(textBuilder: TextBuilder<AST>, ...children: any[]): AST[] {
    const newChildren: AST[] = [];
    for (const child of children) {
        if (child === undefined || child === false || child === null)
            continue;

        if (typeof child === "string")
            newChildren.push(textBuilder(child, true));
        else if (Array.isArray(child))
            newChildren.push(...normalizeChildren(textBuilder, ...child));
        else if (child instanceof HTMLString)
            newChildren.push(textBuilder(child.content, false));
        else
            // potential type-unsafety: assuming the correct AST is present here
            newChildren.push(child)
    }
    return newChildren;
}

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