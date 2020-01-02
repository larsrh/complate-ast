import {Builder} from "../builder";
import {Attributes, AttributeValue, normalizeAttributes} from "../../jsx/syntax";

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
