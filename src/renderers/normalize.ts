import * as Universal from "../ast/universal";
import * as _ from "lodash";
import {allBuilders} from "../ast/builders";

// TODO implement as builder

export function normalizeChildren(kind: Universal.Kind, ...children: any[]): Universal.AST[] {
    const builder = allBuilders[kind];
    return _.flattenDeep(children).filter(child =>
        child !== undefined && child !== false && child !== null
    ).map(child => {
        if (typeof child === "string")
            return builder.text(child);

        const ast = child as Universal.AST;
        if (ast.astType !== kind)
            throw new Error(`Cannot normalize heterogeneous children: Expected ${kind}, received ${ast.astType}`);

        return ast;
    });
}