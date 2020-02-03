export {escapeHTML, normalizeAttribute, normalizeAttributes, normalizeChildren, renderAttributes, isVoidElement} from "./jsx/syntax";

export {info as structuredInfo} from "./ast/structured";
export {info as streamInfo} from "./ast/stream";
export {info as rawInfo} from "./ast/raw";

export {structuredText, streamText, rawText} from "./ast/_text";

export function Fragment<T>(props: {}, ...children: T[]): T[] {
    return children;
}
