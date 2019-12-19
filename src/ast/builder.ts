import {Object} from "../util";

export type AttributeValue = string | null;
export type Attributes<AV = AttributeValue> = Object<AV>;

export interface Builder<A, P = never, AV = AttributeValue> {
    text(text: string): A
    prerendered(p: P): A
    element(tag: string, attributes?: Attributes<AV>, ...children: A[]): A
    attributeValue(value: AttributeValue): AV
}

export function fromDOM<A>(builder: Builder<A>, node: Node): A {
    if (node.nodeName === "#text") {
        const text = (node as Text).textContent;
        if (text !== null)
            return builder.text(text);
        else
            throw new Error("Child node has `null` text");
    }
    if (node.nodeName === "#document-fragment") {
        const element = node as DocumentFragment;
        if (element.childElementCount !== 1)
            throw new Error("Expected document fragment with exactly one child");
        return fromDOM(builder, element.childNodes[0]);
    }
    if (node.nodeName.startsWith("#")) {
        throw new Error(`Expected node types: text, fragment, tree. Received: ${node.nodeName}`);
    }

    // we now have a Element, where nodeName === tagName
    const tree = node as Element;
    return builder.element(
        tree.tagName.toLowerCase(),
        Object.fromEntries(tree.getAttributeNames().map(attr => [attr, tree.getAttribute(attr)])),
        ...Array.from(tree.childNodes).map(child => fromDOM(builder, child))
    );
}