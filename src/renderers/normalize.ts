import {Builder} from "../ast/builder";
import * as Structured from "../ast/structured";
import * as Universal from "../ast/universal";
import * as Raw from "../ast/raw";
import * as Stream from "../ast/stream";
import * as _ from "lodash";
/*
export class NormalizingBuilder implements Builder<Structured.AST<Universal.AST>, any> {

}
*/

const builders =
    new Map<Universal.Kind, Builder<Universal.AST>>([
        ["structured", Structured.astBuilder],
        ["raw", Raw.astBuilder],
        ["stream", Stream.astBuilder]
    ]);

export function normalizeChildren(kind: Universal.Kind, ...children: any[]): Universal.AST[] {
    const builder = builders.get(kind)!;
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