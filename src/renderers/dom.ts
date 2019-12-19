import {Attributes, AttributeValue, Builder} from "../ast/builder";

export class DOMBuilder implements Builder<Node, Node> {
    constructor(
        private readonly document: Document
    ) {}

    element(tag: string, attributes: Attributes, ...children: Node[]): Element {
        const node = this.document.createElement(tag);
        for (const [key, value] of Object.entries(attributes))
            if (value !== null)
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

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }


}
