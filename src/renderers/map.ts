import {StructuredAST, ElementNode, PrerenderedNode, TextNode} from "../ast/structured";
import {Builder} from "../ast/builder";

export class MappingBuilder<P, Q> implements Builder<StructuredAST<Q>, P> {
    constructor(
        private readonly fn: (p: P) => Q
    ) {}

    element(tag: string, attributes: object, ...children: StructuredAST<Q>[]): StructuredAST<Q> {
        return new ElementNode(tag, attributes, children);
    }

    prerendered(p: P): StructuredAST<Q> {
        return new PrerenderedNode(this.fn(p));
    }

    text(text: string): StructuredAST<Q> {
        return new TextNode(text);
    }
}

export class NormalizingBuilder<P> extends MappingBuilder<P, P> {
    constructor() {
        super((p: P) => p);
    }

    element(tag: string, attributes: object, ...children: StructuredAST<P>[]): StructuredAST<P> {
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