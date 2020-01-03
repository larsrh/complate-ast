import {Attributes, AttributeValue, normalizeAttributes} from "../../jsx/syntax";
import {Builder} from "../structured/builder";

export class DOMBuilder implements Builder<Node, Node> {
    constructor(
        private readonly document: Document
    ) {}

    element(tag: string, attributes?: Attributes, ...children: Node[]): Element {
        const node = this.document.createElement(tag);
        for (const [key, value] of Object.entries(normalizeAttributes(false, attributes)))
            node.setAttribute(key, value);
        for (const child of children)
            node.appendChild(child);
        return node;
    }

    prerendered(p: Node): Node {
        return p;
    }

    text(text: string): Text {
        return this.document.createTextNode(text);
    }

    attributeValue(key: string, value: AttributeValue): AttributeValue {
        return value;
    }
}

export function parseHTML(document: Document, html: string): Node {
    const dummy = document.createElement("div");
    dummy.innerHTML = html;
    if (dummy.childNodes.length !== 1)
        throw new Error("Expected exactly one child");
    return dummy.childNodes[0];
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
