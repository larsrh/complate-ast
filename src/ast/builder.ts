import {Attributes, AttributeValue, isDynamic, isMacro, isVoidElement} from "../jsx/syntax";

export interface Builder<A, P = never, AV = AttributeValue> {
    text(text: string): A;
    prerendered(p: P): A;
    element(tag: string, attributes?: Attributes<AV>, ...children: A[]): A;
    attributeValue(value: AttributeValue): AV;
}

export function defaultTagCheck(tag: string, children: any[]): void {
    if (children.length > 0 && isVoidElement(tag))
        throw new Error(`Void element ${tag} must not have children`);
    if (isMacro(tag))
        throw new Error(`Macro tag ${tag} not allowed in an AST`);
    if (isDynamic(tag))
        throw new Error(`Dynamic tag ${tag} not allowed in an AST`);
}