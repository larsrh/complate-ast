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
