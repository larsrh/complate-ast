import * as Base from "./ast/base";
import {info as structuredInfo, AST as StructuredAST} from "./ast/structured";
import {info as streamInfo, AST as StreamAST, force as streamForce} from "./ast/stream";
import {info as rawInfo, AST as RawAST} from "./ast/raw";
import {Attributes} from "./jsx/syntax";
import {TextBuilder} from "./ast/_text";

export type Kind = "raw" | "stream" | "structured"

export type AST = StructuredAST | StreamAST | RawAST

export const astInfos: { [key in Kind]: Base.ASTInfo<AST, any> } = {
    "structured": structuredInfo,
    "stream": streamInfo,
    "raw": rawInfo
};

export function isAST(object: any): object is AST {
    return object.astKind && object.astKind in astInfos;
}

export function normalizeChildren(textBuilder: TextBuilder<AST>, ...children: any[]): AST[] {
    const newChildren: AST[] = [];
    for (const child of children) {
        if (child === undefined || child === false || child === null)
            continue;

        if (typeof child === "string")
            newChildren.push(textBuilder(child));
        else if (Array.isArray(child))
            newChildren.push(...normalizeChildren(textBuilder, ...child));
        else
            // potential type-unsafety: assuming the correct AST is present here
            newChildren.push(child)
    }
    return newChildren;
}

export function addItems<AST extends Base.AST>(ast: AST, attributes?: Attributes, ..._children: any[]): AST {
    if (!isAST(ast))
        throw new Error(`Unknown AST kind ${ast.astKind}`);

    const info = astInfos[ast.astKind];
    const children = normalizeChildren(info.builder.text, ..._children);

    if (info.introspection)
        return info.introspection.addItems(ast, attributes || {}, children) as any;
    else
        throw new Error(`AST kind ${ast.astKind} does not support introspection`);
}

// TODO replace
export function force(ast: AST): AST {
    switch (ast.astKind) {
        case "stream":
            return { astKind: "raw", value: streamForce(ast) };
        default:
            return ast;
    }
}