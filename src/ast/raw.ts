import * as Base from "./base";
import {Attributes, AttributeValue, escapeHTML, isVoidElement, renderAttributes} from "../jsx/syntax";
import {Builder, defaultTagCheck} from "./builder";

export interface AST extends Base.AST {
    readonly astType: "raw";
    readonly value: string;
}

export function create(value: string): AST {
    return {
        astType: "raw",
        value: value
    };
}

export class ASTBuilder implements Builder<AST, string> {
    element(tag: string, attributes?: Attributes, ...children: AST[]): AST {
        defaultTagCheck(tag, children);

        let raw = "";
        raw += "<";
        raw += tag;
        raw += renderAttributes(attributes);
        raw += ">";
        if (!isVoidElement(tag)) {
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

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export const info: Base.ASTInfo<AST> = {
    astType: "raw",
    builder: new ASTBuilder(),
    force: ast => ast,
    asString: ast => ast.value
};
