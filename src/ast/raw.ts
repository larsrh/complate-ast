import {Attributes, AttributeValue, Builder} from "./builder";
import * as Universal from "./universal";
import {escapeHTML} from "../util";

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
        let raw = "";
        raw += "<";
        raw += tag;
        if (attributes)
            for (const [key, value] of Object.entries(attributes))
                if (value !== null) {
                    raw += " ";
                    raw += key;
                    raw += "=\"";
                    raw += escapeHTML(value);
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
        return create(escapeHTML(text));
    }

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export const astBuilder = new ASTBuilder();