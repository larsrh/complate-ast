import * as ESTree from "estree";

// TODO use import ... from
const escapeHtml = require("escape-html");

export type Object<V> = { [key: string]: V }

export const escapeHTML: (s: string) => string = escapeHtml;

export function isMacro(tag: string): boolean {
    const first = tag.charAt(0);
    return first.toLowerCase() !== first;
}

export function mapObject<V, W>(object: Object<V>, fn: (v: V) => W): Object<W> {
    return Object.fromEntries(Object.entries(object).map(entry => {
        const [key, value] = entry;
        return [key, fn(value)]
    }));
}

// TODO use hygiene?
export class Gensym {
    private counter: bigint;

    constructor(
        readonly prefix: string
    ) {
        this.counter = BigInt(0);
    }

    sym(): ESTree.Identifier {
        this.counter += BigInt(1);
        return {
            type: "Identifier",
            name: this.prefix + this.counter
        };
    }
}
