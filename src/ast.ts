import * as Base from "./ast/base";
import * as _ from "lodash";
import * as Structured from "./ast/structured";
import * as Raw from "./ast/raw";
import * as Stream from "./ast/stream";
import {Attributes} from "./jsx/syntax";

export type Kind = "raw" | "stream" | "structured"

export type AST = Structured.AST | Stream.AST | Raw.AST

export const astInfos: { [key in Kind]: Base.ASTInfo<AST> } = {
    "structured": Structured.info,
    "stream": Stream.info,
    "raw": Raw.info
};

export function isAST(object: any): object is AST {
    return object.astType && object.astType in astInfos;
}

export function isStructured(ast: Base.AST): ast is Structured.AST<any> {
    return ast.astType === "structured";
}

export function isStream(ast: Base.AST): ast is Stream.AST {
    return ast.astType === "stream";
}

export function isRaw(ast: Base.AST): ast is Raw.AST {
    return ast.astType === "raw";
}

function streamChildrenAdder(children: Stream.AST[]): Stream.Modifier<Stream.AST[]> {
    if (children.length === 0)
        return children => children;
    else
        return oldChildren => {
            if (oldChildren === undefined)
                oldChildren = [];
            return [...oldChildren, ...children as Stream.AST[]];
        };
}

function streamAttributeAdder(attributes?: Attributes): Stream.Modifier<Attributes> {
    if (attributes === undefined)
        return attrs => attrs;
    else
        return oldAttributes => ({... oldAttributes, ...attributes});
}

export function normalizeChildren(kind: Kind, ...children: any[]): AST[] {
    const builder = astInfos[kind].builder;
    return _.flattenDeep(children).filter(child =>
        child !== undefined && child !== false && child !== null
    ).map(child => {
        if (typeof child === "string")
            return builder.text(child);

        if (!isAST(child))
            throw new Error("Invalid child: Expected AST");
        if (child.astType !== kind)
            throw new Error(`Cannot normalize heterogeneous children: Expected ${kind}, received ${child.astType}`);

        return child;
    });
}

export function addItems<AST extends Base.AST>(ast: AST, attributes?: Attributes, ..._children: any[]): AST {
    if (!isAST(ast))
        throw new Error(`Unknown AST kind ${ast.astType}`);

    const children = normalizeChildren(ast.astType, ..._children);

    switch (ast.astType) {
        case "structured":
            switch (ast.nodeType) {
                case "element": {
                    const newChildren = [...ast.children, ...children as Structured.AST<any>[]];
                    const newAttributes = {...ast.attributes, ...attributes};
                    return new Structured.ElementNode(ast.tag, newAttributes, newChildren) as any as AST;
                }
                default:
                    // TODO look into prerendered?

                    throw new Error(`Supplied node is ${ast.nodeType} and has no children`);
            }
        case "stream":
            return Stream._clone(
                ast,
                streamChildrenAdder(children as Stream.AST[]),
                streamAttributeAdder(attributes)
            ) as any as AST;
        case "raw":
            throw new Error("Raw AST does not support modification");
    }
}

export function force(ast: AST): AST {
    switch (ast.astType) {
        case "stream":
            return { astType: "raw", value: Stream.force(ast) };
        default:
            return ast;
    }
}