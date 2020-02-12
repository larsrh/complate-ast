import {Attributes, normalizeAttributes} from "../../jsx/syntax";
import {Builder} from "../builder";

export class DOMBuilder extends Builder<Node, Node> {
    constructor(
        private readonly document: Document
    ) { super(); }

    element(tag: string, attributes?: Attributes, ...children: Node[]): Element {
        const node = this.document.createElement(tag);
        for (const [key, value] of Object.entries(normalizeAttributes(attributes)))
            node.setAttribute(key, value === true ? "" : value);
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
}

