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

export const isVoidElement: (s: string) => boolean =
    voidElements.has.bind(voidElements);

export function isFalsy(x: any): boolean {
    return x === null || x === undefined || x === false;
}

export function normalizeAttribute(key: string, value: AttributeValue): string | null {
    if (value === true)
        return key;
    else if (isFalsy(value))
        return null;
    else if (typeof value === "string")
        return value;
    else
        // in TypeScript-typed calls this can't happen
        throw new Error(`Unknown value type for attribute ${value}`);
}

export function normalizeAttributes(escape: boolean, attrs?: Attributes): Attributes<string> {
    if (attrs === undefined)
        return {};

    const normalized = filterObject(mapObject(attrs, (value, key) => normalizeAttribute(key, value)));
    if (escape)
        return mapObject(normalized, value => escapeHTML(value));

    return normalized;
}