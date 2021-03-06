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

const htmlRawProp = "__raw_html";

export class HTMLString {

    private readonly [htmlRawProp]: string;

    constructor(content: string) {
        this[htmlRawProp] = content;
    }

}

function isHTMLString(value: any): value is HTMLString {
    return typeof value === "object" && htmlRawProp in value && typeof value[htmlRawProp] === "string";
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
        else if (isHTMLString(child))
            newChildren.push(textBuilder(child[htmlRawProp], false));
        else if (typeof child !== "object" || !child.astKind)
            newChildren.push(textBuilder(child.toString(), true));
        else
            // potential type-unsafety: assuming the correct AST is present here
            newChildren.push(child)
    }
    return newChildren;
}

export function flatCompact(...children: any[]): any[] {
    const result: any[] = [];
    for (const child of children) {
        if (child === undefined || child === false || child === null)
            continue;

        if (Array.isArray(child))
            result.push(...flatCompact(...child));
        else
            result.push(child);
    }
    return result;
}