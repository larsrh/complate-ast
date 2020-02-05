import * as Base from "./ast/base";
import {AST as StructuredAST, info as structuredInfo} from "./ast/structured";
import {AST as StreamAST, info as streamInfo} from "./ast/stream";
import {AST as RawAST, info as rawInfo} from "./ast/raw";
import {Attributes, normalizeChildren} from "./jsx/syntax";

export type Kind = "raw" | "stream" | "structured"

export const allKinds: Kind[] = ["raw", "stream", "structured"];

export type AST = StructuredAST<string> | StreamAST | RawAST

export function astInfos(kind: Kind): Base.ASTInfo<AST, any> {
    switch (kind) {
        case "structured":
            return structuredInfo();
        case "stream":
            return streamInfo();
        case "raw":
            return rawInfo();
    }
}

export function isAST(object: any): object is AST {
    return object.astKind && allKinds.includes(object.astKind);
}

export function addItems<AST extends Base.AST>(ast: AST, attributes?: Attributes, ..._children: any[]): AST {
    if (!isAST(ast))
        throw new Error(`Unknown AST kind ${ast.astKind}`);

    const info = astInfos(ast.astKind);
    const children = normalizeChildren(info.builder.text, ..._children);

    if (info.introspection)
        return info.introspection.addItems(ast, attributes || {}, children) as any;
    else
        throw new Error(`AST kind ${ast.astKind} does not support introspection`);
}
