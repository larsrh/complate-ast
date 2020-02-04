import * as Structured from "./structured";
import * as Stream from "./stream";
import * as Raw from "./raw";
import {escapeHTML} from "../jsx/syntax";

// optimized builders for plain text nodes

export function structuredText<P>(text: string): Structured.AST<P> {
    return {
        astKind: "structured",
        nodeType: "text",
        text: text
    };
}

export function streamText(text: string): Stream.AST {
    return {
        astKind: "stream",
        isElement: false,
        render: buffer => buffer.write(escapeHTML(text))
    };
}

export function rawText(text: string): Raw.AST {
    return {
        astKind: "raw",
        value: escapeHTML(text)
    };
}