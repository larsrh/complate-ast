import * as Structured from "./structured";
import * as Stream from "./stream";
import * as Raw from "./raw";
import {escapeHTML} from "../jsx/syntax";

// optimized builders for plain text nodes

export function structuredText(text: string, escape: boolean): Structured.AST<string> {
    if (escape)
        return {
            astKind: "structured",
            nodeType: "text",
            text: text
        };
    else
        return {
            astKind: "structured",
            nodeType: "prerendered",
            content: text
        }
}

export function streamText(_text: string, escape: boolean): Stream.AST {
    const text = escape ? escapeHTML(_text) : _text;
    return {
        astKind: "stream",
        isElement: false,
        render: buffer => buffer.write(text)
    };
}

export function rawText(_text: string, escape): Raw.AST {
    const text = escape ? escapeHTML(_text) : _text;
    return {
        astKind: "raw",
        value: text
    };
}