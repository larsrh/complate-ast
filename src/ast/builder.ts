import {Attributes, AttributeValue, isDynamic, isMacro, isVoidElement} from "../jsx/syntax";

export interface BaseBuilder<A, P = never, AV = AttributeValue> {
    text(text: string): A;
    prerendered(p: P): A;
    element(tag: string, attributes?: Attributes<AV>, ...children: A[]): A;
    attributeValue(value: AttributeValue): AV;
}

export abstract class Builder<A, P = never> implements BaseBuilder<A, P> {
    abstract text(text: string): A;
    abstract prerendered(p: P): A;
    abstract element(tag: string, attributes?: Attributes, ...children: A[]): A;

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export function defaultTagCheck(tag: string, children: any[]): void {
    if (children.length > 0 && isVoidElement(tag))
        throw new Error(`Void element ${tag} must not have children`);
    if (isMacro(tag))
        throw new Error(`Macro tag ${tag} not allowed in an AST`);
    if (isDynamic(tag))
        throw new Error(`Dynamic tag ${tag} not allowed in an AST`);
}