import * as Base from "./base";
import * as Raw from "./raw";
import {mapObject} from "../util";
import {Attributes, AttributeValue, normalizeAttributes} from "../jsx/syntax";
import {Builder, defaultTagCheck} from "./builder";

export type NodeType = "text" | "element" | "prerendered"

export type AST<P = never> = TextNode | ElementNode<P> | PrerenderedNode<P>

export interface BaseAST<P = never> extends Base.AST {
    readonly nodeType: NodeType;
    readonly astType: "structured";
}

export function render<P, O, AV>(ast: AST<P>, builder: Builder<O, P, AV>): O {
    switch (ast.nodeType) {
        case "text":
            return builder.text((ast as TextNode).text);
        case "element":
            return builder.element(
                ast.tag,
                mapObject(ast.attributes, (attr, key) => builder.attributeValue(key, attr)),
                ...ast.children.map(child => render(child, builder))
            );
        case "prerendered":
            return builder.prerendered(ast.content);
    }
}

export class TextNode implements BaseAST {
    public readonly nodeType = "text";
    public readonly astType = "structured";

    constructor(
        public readonly text: string
    ) {}
}

export class ElementNode<P> implements BaseAST<P> {
    public readonly nodeType = "element";
    public readonly astType = "structured";

    constructor(
        public readonly tag: string,
        public readonly attributes: Attributes,
        public readonly children: AST<P>[]
    ) {
        defaultTagCheck(tag, children);
    }
}

export class PrerenderedNode<P> implements BaseAST<P> {
    public readonly nodeType = "prerendered";
    public readonly astType = "structured";

    constructor(
        public readonly content: P
    ) {}
}

export class ASTBuilder<P = never> implements Builder<AST<P>, P> {
    constructor(
        // false only for testing
        public readonly _normalize: boolean = true
    ) {}

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

    attributeValue(key: string, value: AttributeValue): AttributeValue {
        return value;
    }
}

export const info: Base.ASTInfo<AST> = {
    astType: "structured",
    builder: new ASTBuilder(),
    force: t => t,
    asString: ast => render(ast, Raw.info.builder).value
};

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

    attributeValue(key: string, value: AttributeValue): AttributeValue {
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

    attributeValue(key: string, value: AttributeValue): AttributeValue {
        return value;
    }
}

export function flatten<P>(ast: AST<AST<P>>): AST<P> {
    return render(ast, new FlatteningBuilder());
}