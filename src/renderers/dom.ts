import { Renderer } from "../renderer";

export class DOMRenderer implements Renderer<Node, Node> {
    constructor(
        private readonly document: Document
    ) {}

    renderElement(tag: string, attributes: Map<string, string>, children: Node[]): Element {
        const node = this.document.createElement(tag);
        for (const [key, value] of attributes.entries())
            node.setAttribute(key, value);
        for (const child of children)
            node.appendChild(child);
        return node;
    }

    renderPrerendered(p: Node): Node {
        return p;
    }

    renderText(text: string): Text {
        return this.document.createTextNode(text);
    }
}
