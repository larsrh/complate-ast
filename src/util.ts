// TODO use import ... from
const escapeHtml = require("escape-html");

export const escapeHTML: (s: string) => string = escapeHtml;

export function isMacro(tag: string): boolean {
    const first = tag.charAt(0);
    return first.toLowerCase() !== first;
}