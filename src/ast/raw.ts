import {Builder} from "./builder";
import * as Universal from "./universal";
import {
    Attributes,
    AttributeValue,
    escapeHTML,
    isMacro,
    isVoidElement,
    normalizeAttributes
} from "../jsx/syntax";

export interface AST extends Universal.AST {
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
    element(tag: string, attributes?: Attributes, ...children: AST[]): AST {
        if (isMacro(tag))
            throw new Error(`Macro tag ${tag} not allowed in an AST`);
        let raw = "";
        raw += "<";
        raw += tag;
        for (const [key, value] of Object.entries(normalizeAttributes(true, attributes))) {
            raw += " ";
            raw += key;
            raw += "=\"";
            raw += value;
            raw += "\"";
        }
        raw += ">";
        if (isVoidElement(tag)) {
            if (children.length > 0)
                throw new Error(`Void element ${tag} must not have children`);
        }
        else {
            children.forEach(child => raw += child.value);
            raw += "</";
            raw += tag;
            raw += ">";
        }
        return create(raw);
    }

    prerendered(p: string): AST {
        return create(p);
    }

    text(text: string): AST {
        return create(escapeHTML(text));
    }

    attributeValue(key: string, value: AttributeValue): AttributeValue {
        return value;
    }
}

export const astBuilder = new ASTBuilder();