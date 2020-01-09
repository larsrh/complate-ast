import * as Base from "./ast/base";
import * as _ from "lodash";
import * as Structured from "./ast/structured";
import * as Raw from "./ast/raw";
import * as Stream from "./ast/stream";
import {Attributes} from "./jsx/syntax";

export type Kind = "raw" | "stream" | "structured"

export type AST = Structured.AST | Stream.AST | Raw.AST

export const astInfos: { [key in Kind]: Base.ASTInfo<AST, any> } = {
    "structured": Structured.info,
    "stream": Stream.info,
    "raw": Raw.info
};

export function isAST(object: any): object is AST {
    return object.astType && object.astType in astInfos;
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
    const info = astInfos[ast.astType];

    if (info.introspection)
        return info.introspection.addItems(ast, attributes || {}, children) as any;
    else
        throw new Error(`AST kind ${ast.astType} does not support introspection`);
}

// TODO replace
export function force(ast: AST): AST {
    switch (ast.astType) {
        case "stream":
            return { astType: "raw", value: Stream.force(ast) };
        default:
            return ast;
    }
}