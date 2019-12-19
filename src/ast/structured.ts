import {Attributes, AttributeValue, Builder} from "./builder"
import * as Universal from "./universal";
import {mapObject} from "../util";

export type NodeType = "text" | "element" | "prerendered"

export interface AST<P> extends Universal.AST {
    readonly nodeType: NodeType
    readonly astType: "structured"
}

export function render<P, O, AV>(ast: AST<P>, renderer: Builder<O, P, AV>): O {
    if (ast.nodeType === "text") {
        return renderer.text((ast as TextNode).text);
    }
    if (ast.nodeType == "element") {
        const node = ast as ElementNode<P>;
        const attributes = mapObject(node.attributes, attr => renderer.attributeValue(attr));
        return renderer.element(
            node.tag,
            attributes,
            ...node.children.map(child => render(child, renderer))
        );
    }
    if (ast.nodeType == "prerendered") {
        return renderer.prerendered((ast as PrerenderedNode<P>).content);
    }
    throw new Error("Invalid AST");
}

export class TextNode implements AST<never> {
    public readonly nodeType = "text";
    public readonly astType = "structured";

    constructor(
        public readonly text: string
    ) {}
}

export class ElementNode<P> implements AST<P> {
    public readonly nodeType = "element";
    public readonly astType = "structured";

    constructor(
        public readonly tag: string,
        public readonly attributes: Attributes,
        public readonly children: AST<P>[]
    ) {}
}

export class PrerenderedNode<P> implements AST<P> {
    public readonly nodeType = "prerendered";
    public readonly astType = "structured";

    constructor(
        public readonly content: P
    ) {}
}

export type DOMNodeAST = AST<Node>

export class ASTBuilder<P> implements Builder<AST<P>, P> {
    element(tag: string, attributes?: Attributes, ...children: AST<P>[]): AST<P> {
        return new ElementNode<P>(
            tag,
            attributes ? attributes : {},
            children ? children : []
        );
    }

    prerendered(p: P): AST<P> {
        return new PrerenderedNode<P>(p);
    }

    text(text: string): AST<P> {
        return new TextNode(text);
    }

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export const astBuilder = new ASTBuilder<never>();

export class MappingBuilder<P, Q> implements Builder<AST<Q>, P> {
    constructor(
        private readonly fn: (p: P) => Q
    ) {}

    element(tag: string, attributes?: Attributes, ...children: AST<Q>[]): AST<Q> {
        return new ElementNode(tag, attributes ? attributes : {}, children);
    }

    prerendered(p: P): AST<Q> {
        return new PrerenderedNode(this.fn(p));
    }

    text(text: string): AST<Q> {
        return new TextNode(text);
    }

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export function map<P, Q>(ast: AST<P>, fn: (p: P) => Q): AST<Q> {
    return render(ast, new MappingBuilder(fn));
}

export class FlatteningBuilder<P> implements Builder<AST<P>, AST<P>> {
    element(tag: string, attributes?: Attributes, ...children: AST<P>[]): AST<P> {
        return new ElementNode(tag, attributes ? attributes : {}, children);
    }

    prerendered(p: AST<P>): AST<P> {
        return p;
    }

    text(text: string): AST<P> {
        return new TextNode(text);
    }

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export function flatten<P>(ast: AST<AST<P>>): AST<P> {
    return render(ast, new FlatteningBuilder());
}