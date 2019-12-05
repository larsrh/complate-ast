import { Renderer } from "./renderer"

export type StructuredNodeType = "text" | "element"
export type SemiStructuredNodeType = StructuredNodeType | "prerendered"

export interface SemiStructuredAST<P> {
    getNodeType(): SemiStructuredNodeType

    render<O>(renderer: Renderer<P, O>): O
}

export type StructuredAST = SemiStructuredAST<never>

export class TextNode implements StructuredAST {
    constructor(
        public readonly text: string
    ) {}

    getNodeType(): StructuredNodeType {
        return "text";
    }

    render<O>(renderer: Renderer<never, O>): O {
        return renderer.renderText(this.text);
    }
}

export class ElementNode<P> implements SemiStructuredAST<P> {
    constructor(
        public readonly tag: string,
        public readonly attributes: Map<string, string>,
        public readonly children: SemiStructuredAST<P>[]
    ) {}

    getNodeType(): StructuredNodeType {
        return "element";
    }

    render<O>(renderer: Renderer<P, O>): O {
        return renderer.renderElement(
            this.tag,
            this.attributes,
            this.children.map(child => child.render(renderer))
        );
    }
}

export class PrerenderedNode<P> implements SemiStructuredAST<P> {
    constructor(
        public readonly content: P
    ) {}

    getNodeType(): SemiStructuredNodeType {
        return "prerendered";
    }

    render<O>(renderer: Renderer<P, O>): O {
        return renderer.renderPrerendered(this.content);
    }
}

export type DOMNodeAST = SemiStructuredAST<Element>
export type PrerenderedDOMNode = PrerenderedNode<Element>

export const builder = {
    text(text: string): TextNode {
        return new TextNode(text);
    },
    prerendered<P>(p: P): PrerenderedNode<P> {
        return new PrerenderedNode<P>(p);
    },
    element<P>(tag: string, attributes?: Map<string, string>, ...children: SemiStructuredAST<P>[]): ElementNode<P> {
        return new ElementNode<P>(
            tag,
            attributes ? attributes : new Map<string, string>(),
            children ? children : []
        );
    }
};