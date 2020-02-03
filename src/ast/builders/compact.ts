import * as Structured from "../structured";
import {Attributes, normalizeAttributes} from "../../jsx/syntax";
import {mapObject} from "../../util";
import {defaultTo} from "lodash-es";

export interface CompactingOptions {
    readonly children?: boolean;
    readonly attributes?: boolean;
    readonly trueAttributes?: boolean;
}

export class CompactingBuilder<P> extends Structured.MappingBuilder<P, P> {
    private readonly doChildren: boolean;
    private readonly doAttributes: boolean;
    private readonly doTrueAttributes: boolean;

    constructor(what: CompactingOptions = {}) {
        super((p: P) => p);

        this.doChildren = defaultTo(what.children, true);
        this.doAttributes = defaultTo(what.attributes, true);
        this.doTrueAttributes = defaultTo(what.trueAttributes, false);
    }

    element(tag: string, attributes?: Attributes, ...children: Structured.AST<P>[]): Structured.AST<P> {
        let newChildren: Structured.AST<P>[];
        if (this.doChildren) {
            newChildren = [];
            let currentText = "";
            for (const child of children) {
                if (child.nodeType === "text") {
                    currentText += child.text;
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
        }
        else {
            newChildren = children;
        }

        let newAttributes: Attributes = attributes ? attributes : {};
        if (this.doAttributes)
            newAttributes = normalizeAttributes(newAttributes);
        if (this.doTrueAttributes)
            newAttributes = mapObject(newAttributes, value => value === true ? "" : value);

        return new Structured.ElementNode(tag, newAttributes, newChildren);
    }
}