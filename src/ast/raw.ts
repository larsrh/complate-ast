import {Builder} from "./builder";

// TODO use import ... from
const escapeHtml = require("escape-html");

export interface AST {
    readonly astType: "raw"
    readonly value: string
}

export function create(value: string): AST {
    return {
        astType: "raw",
        value: value
    };
}

export class ASTBuilder implements Builder<AST, string> {
    element(tag: string, attributes?: object, ...children: AST[]): AST {
        let raw = "";
        raw += "<";
        raw += tag;
        if (attributes)
            for (const [key, value] of Object.entries(attributes)) {
                raw += " ";
                raw += key;
                raw += "=\"";
                raw += escapeHtml(value);
                raw += "\"";
            }
        raw += ">";
        children.forEach(child => raw += child.value);
        raw += "</";
        raw += tag;
        raw += ">";
        return create(raw);
    }

    prerendered(p: string): AST {
        return create(p);
    }

    text(text: string): AST {
        return create(escapeHtml(text));
    }

}

export const astBuilder = new ASTBuilder();