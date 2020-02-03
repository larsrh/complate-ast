export {addItems, normalizeChildren} from "./ast";
export {escapeHTML, normalizeAttribute, normalizeAttributes, renderAttributes, isVoidElement} from "./jsx/syntax";

import * as Structured from "./ast/structured";
import * as Stream from "./ast/stream";
import * as Raw from "./ast/raw";

export const structuredBuilder = Structured.info.builder;
export const streamBuilder = Stream.info.builder;
export const rawBuilder = Raw.info.builder;

export {structuredText, streamText, rawText} from "./ast/_text";

export function Fragment<T>(props: {}, ...children: T[]): T[] {
    return children;
}
