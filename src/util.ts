// TODO use import ... from
const escapeHtml = require("escape-html");

export function mapValues<K, V, W>(map: Map<K, V>, fn: (v: V) => W): Map<K, W> {
    return new Map<K, W>([...map.entries()].map(entry => {
        const [key, value] = entry;
        return [key, fn(value)];
    }))
}

export const escapeHTML: (s: string) => string = escapeHtml;