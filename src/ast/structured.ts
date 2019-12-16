import { Renderer } from "../renderer"
import { Builder } from "./builder"

export type StructuredNodeType = "text" | "element" | "prerendered"

export interface StructuredAST<P> {
    readonly nodeType: StructuredNodeType
    readonly astType: "structured"
}

export function render<P, O>(ast: StructuredAST<P>, renderer: Renderer<P, O>): O {
    if (ast.nodeType === "text") {
        return renderer.renderText((ast as TextNode).text);
    }
    if (ast.nodeType == "element") {
        const node = ast as ElementNode<P>;
        return renderer.renderElement(
            node.tag,
            node.attributes,
            node.children.map(child => render(child, renderer))
        );
    }
    if (ast.nodeType == "prerendered") {
        return renderer.renderPrerendered((ast as PrerenderedNode<P>).content);
    }
    throw new Error("Invalid AST");
}

export class TextNode implements StructuredAST<never> {
    public readonly nodeType = "text";
    public readonly astType = "structured";

    constructor(
        public readonly text: string
    ) {}
}

export class ElementNode<P> implements StructuredAST<P> {
    public readonly nodeType = "element";
    public readonly astType = "structured";

    constructor(
        public readonly tag: string,
        public readonly attributes: object,
        public readonly children: StructuredAST<P>[]
    ) {}
}

export class PrerenderedNode<P> implements StructuredAST<P> {
    public readonly nodeType = "prerendered";
    public readonly astType = "structured";

    constructor(
        public readonly content: P
    ) {}
}

export type DOMNodeAST = StructuredAST<Node>

export class StructuredBuilder<P> implements Builder<StructuredAST<P>, P> {
    element(tag: string, attributes?: object, ...children: StructuredAST<P>[]): StructuredAST<P> {
        return new ElementNode<P>(
            tag,
            attributes ? attributes : {},
            children ? children : []
        );
    }

    prerendered(p: P): StructuredAST<P> {
        return new PrerenderedNode<P>(p);
    }

    text(text: string): StructuredAST<P> {
        return new TextNode(text);
    }
}

export const builder = new StructuredBuilder<never>();

export function fromDOM(node: Node): StructuredAST<never> {
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
        return fromDOM(element.childNodes[0]);
    }
    if (node.nodeName.startsWith("#")) {
        throw new Error(`Expected node types: text, fragment, tree. Received: ${node.nodeName}`);
    }

    // we now have a Element, where nodeName === tagName
    const tree = node as Element;
    return builder.element(
        tree.tagName.toLowerCase(),
        Object.fromEntries(tree.getAttributeNames().map(attr => [attr, tree.getAttribute(attr)])),
        ...Array.from(tree.childNodes).map(child => fromDOM(child))
    );
}