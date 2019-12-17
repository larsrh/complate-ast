import * as Structured from "../ast/structured";

export class NormalizingBuilder<P> extends Structured.MappingBuilder<P, P> {
    constructor() {
        super((p: P) => p);
    }

    element(tag: string, attributes: object, ...children: Structured.AST<P>[]): Structured.AST<P> {
        const newChildren = new Array<Structured.AST<P>>();
        let currentText = "";
        for (const child of children) {
            if (child.nodeType === "text") {
                currentText += (child as Structured.TextNode).text;
            }
            else {
                if (currentText !== "") {
                    newChildren.push(new Structured.TextNode(currentText));
                    currentText = "";
                }
                newChildren.push(child);
            }
        }
        if (currentText !== "")
            newChildren.push(new Structured.TextNode(currentText));
        return new Structured.ElementNode(tag, attributes, newChildren);
    }
}