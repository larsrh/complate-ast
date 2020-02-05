import {complate} from "./tools/rollup";

export const rollupPlugin = complate;

export {Fragment} from "./runtime";

import {HTMLString} from "./jsx/syntax";

export function safe(content: string): HTMLString {
    return new HTMLString(content);
}

export {addItems} from "./ast";