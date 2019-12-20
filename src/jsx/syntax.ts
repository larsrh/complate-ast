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