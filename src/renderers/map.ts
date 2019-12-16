import {Renderer} from "../renderer";
import {StructuredAST, ElementNode, PrerenderedNode, TextNode} from "../ast/structured";

export class MappingRenderer<P, Q> implements Renderer<P, StructuredAST<Q>> {
    constructor(
        private readonly fn: (p: P) => Q
    ) {}

    renderElement(tag: string, attributes: object, children: StructuredAST<Q>[]): StructuredAST<Q> {
        return new ElementNode(tag, attributes, children);
    }

    renderPrerendered(p: P): StructuredAST<Q> {
        return new PrerenderedNode(this.fn(p));
    }

    renderText(text: string): StructuredAST<Q> {
        return new TextNode(text);
    }
}

export class NormalizingRenderer<P> extends MappingRenderer<P, P> {
    constructor() {
        super((p: P) => p);
    }

    renderElement(tag: string, attributes: object, children: StructuredAST<P>[]): StructuredAST<P> {
        const newChildren = new Array<StructuredAST<P>>();
        let currentText = "";
        for (const child of children) {
            if (child.nodeType === "text") {
                currentText += (child as TextNode).text;
            }
            else {
                if (currentText !== "") {
                    newChildren.push(new TextNode(currentText));
                    currentText = "";
                }
                newChildren.push(child);
            }
        }
        if (currentText !== "")
            newChildren.push(new TextNode(currentText));
        return new ElementNode(tag, attributes, newChildren);
    }
}