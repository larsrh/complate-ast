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