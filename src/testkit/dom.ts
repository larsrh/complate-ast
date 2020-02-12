import {Builder} from "../ast/builder";

export function parseHTML(document: Document, html: string): Node {
    const dummy = document.createElement("div");
    dummy.innerHTML = html;
    if (dummy.childNodes.length !== 1)
        throw new Error("Expected exactly one child");
    return dummy.childNodes[0];
}

// TODO add tests
export function compareHTML(html1: string, html2: string): void {
    if (html1 === html2)
        return;

    const dom1 = parseHTML(document, html1);
    const dom2 = parseHTML(document, html2);

    expect(dom2).toEqual(dom1);
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