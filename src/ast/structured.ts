import { Builder } from "./builder"

export type StructuredNodeType = "text" | "element" | "prerendered"

export interface StructuredAST<P> {
    readonly nodeType: StructuredNodeType
    readonly astType: "structured"
}

export function render<P, O>(ast: StructuredAST<P>, renderer: Builder<O, P>): O {
    if (ast.nodeType === "text") {
        return renderer.text((ast as TextNode).text);
    }
    if (ast.nodeType == "element") {
        const node = ast as ElementNode<P>;
        return renderer.element(
            node.tag,
            node.attributes,
            ...node.children.map(child => render(child, renderer))
        );
    }
    if (ast.nodeType == "prerendered") {
        return renderer.prerendered((ast as PrerenderedNode<P>).content);
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
