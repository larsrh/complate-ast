import * as Base from "./base";
import * as Raw from "./raw";
import {mapObject} from "../util";
import {Attributes, normalizeAttributes} from "../jsx/syntax";
import {BaseBuilder, Builder, defaultTagCheck} from "./builder";

export type NodeType = "text" | "element" | "prerendered"

export type AST<P = never> = TextNode | ElementNode<P> | PrerenderedNode<P>

export interface BaseAST extends Base.AST {
    readonly nodeType: NodeType;
    readonly astKind: "structured";
}

export function render<P, O, AV>(ast: AST<P>, builder: BaseBuilder<O, P, AV>): O {
    switch (ast.nodeType) {
        case "text":
            return builder.text((ast as TextNode).text);
        case "element":
            return builder.element(
                ast.tag,
                mapObject(ast.attributes, attr => builder.attributeValue(attr)),
                ...ast.children.map(child => render(child, builder))
            );
        case "prerendered":
            return builder.prerendered(ast.content);
    }
}

export class TextNode implements BaseAST {
    public readonly nodeType = "text";
    public readonly astKind = "structured";

    constructor(
        public readonly text: string
    ) {}
}

export class ElementNode<P> implements BaseAST {
    public readonly nodeType = "element";
    public readonly astKind = "structured";

    constructor(
        public readonly tag: string,
        public readonly attributes: Attributes,
        public readonly children: AST<P>[]
    ) {
        defaultTagCheck(tag, children);
    }
}

export class PrerenderedNode<P> implements BaseAST {
    public readonly nodeType = "prerendered";
    public readonly astKind = "structured";

    constructor(
        public readonly content: P
    ) {}
}

export class ASTBuilder<P = never> extends Builder<AST<P>, P> {
    constructor(
        // false only for testing
        public readonly _normalize: boolean = true
    ) { super(); }

    element(tag: string, attributes?: Attributes, ...children: AST<P>[]): AST<P> {
        if (this._normalize)
            attributes = normalizeAttributes(attributes);
        return new ElementNode<P>(tag, attributes || {}, children);
    }

    prerendered(p: P): AST<P> {
        return new PrerenderedNode<P>(p);
    }

    text(text: string): AST<P> {
        return new TextNode(text);
    }
}

export const info: Base.ASTInfo<AST> = {
    astKind: "structured",
    builder: new ASTBuilder(),
    introspection: {
        addItems(ast: AST, attributes: Attributes, children: AST[]): AST {
            switch (ast.nodeType) {
                case "element": {
                    const newChildren = [...ast.children, ...children];
                    const newAttributes = {...ast.attributes, ...attributes};
                    return new ElementNode(ast.tag, newAttributes, newChildren);
                }
                default:
                    throw new Error(`Supplied node is ${ast.nodeType} and has no children`);
            }
        }
    },
    force: t => t,
    asString: ast => render(ast, Raw.info.builder).value
};

export class MappingBuilder<P, Q> extends Builder<AST<Q>, P> {
    constructor(
        private readonly fn: (p: P) => Q
    ) { super(); }

    element(tag: string, attributes?: Attributes, ...children: AST<Q>[]): AST<Q> {
        return new ElementNode(tag, attributes ? attributes : {}, children);
    }

    prerendered(p: P): AST<Q> {
        return new PrerenderedNode(this.fn(p));
    }

    text(text: string): AST<Q> {
        return new TextNode(text);
    }
}

export function map<P, Q>(ast: AST<P>, fn: (p: P) => Q): AST<Q> {
    return render(ast, new MappingBuilder(fn));
}

export class FlatteningBuilder<P> extends Builder<AST<P>, AST<P>> {
    element(tag: string, attributes?: Attributes, ...children: AST<P>[]): AST<P> {
        return new ElementNode(tag, attributes ? attributes : {}, children);
    }

    prerendered(p: AST<P>): AST<P> {
        return p;
    }

    text(text: string): AST<P> {
        return new TextNode(text);
    }
}

export function flatten<P>(ast: AST<AST<P>>): AST<P> {
    return render(ast, new FlatteningBuilder());
}