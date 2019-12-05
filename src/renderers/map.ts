import {Renderer} from "../renderer";
import { SemiStructuredAST, ElementNode, PrerenderedNode, TextNode } from "../ast";

export class MappingRenderer<P, Q> implements Renderer<P, SemiStructuredAST<Q>> {
    constructor(
        private readonly fn: (p: P) => Q
    ) {}

    renderElement(tag: string, attributes: Map<string, string>, children: SemiStructuredAST<Q>[]): SemiStructuredAST<Q> {
        return new ElementNode(tag, attributes, children);
    }

    renderPrerendered(p: P): SemiStructuredAST<Q> {
        return new PrerenderedNode(this.fn(p));
    }

    renderText(text: string): SemiStructuredAST<Q> {
        return new TextNode(text);
    }
}
