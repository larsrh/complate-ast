export {escapeHTML, flatCompact, normalizeAttribute, normalizeAttributes, normalizeChildren, renderAttributes, isVoidElement} from "./syntax/util";
export {structuredText, streamText, rawText} from "./ast/_text";

export {info as structuredInfo} from "./ast/structured";
export {info as streamInfo} from "./ast/stream";
export {info as rawInfo} from "./ast/raw";

export function Fragment<T>(props: {}, ...children: T[]): T[] {
    return children;
}

import {HTMLString} from "./syntax/util";

export function safe(content: string): HTMLString {
    return new HTMLString(content);
}

export function __UnsafeRaw(props: { html: string }): HTMLString {
    return safe(props.html);
}
