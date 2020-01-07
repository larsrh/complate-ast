import * as ESTree from "estree";
import {isDynamic} from "../syntax";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {ArrayExpr} from "../../estree/expr";
import {Kind} from "../../ast";

export function tagExpression(tag: string): ESTree.Expression {
    if (isDynamic(tag))
        return Operations.identifier(tag.substring(1));
    else
        return Reify.string(tag);
}

export function processStaticAttribute(literal: ESTree.Literal): string | boolean | null {
    const value = literal.value;
    if (value === null)
        return null;
    else if (typeof value === "boolean")
        return value;
    else if (typeof value === "string")
        return value;
    else if (typeof value === "number")
        return value.toString();
    else
        // RegExp, undefined or others
        throw new Error(`Unknown literal type ${literal}`);
}

// TODO use hygiene?
export class Gensym {
    private counter: bigint;

    constructor(
        readonly prefix: string
    ) {
        this.counter = BigInt(0);
    }

    sym(): ESTree.Identifier {
        this.counter += BigInt(1);
        return Operations.identifier(this.prefix + this.counter);
    }
}

export class RuntimeModule {
    constructor(
        private readonly runtime: ESTree.Expression,
        private readonly mode: Kind
    ) {}

    _member(name: string): ESTree.Expression {
        return Operations.member(this.runtime, Operations.identifier(name));
    }

    _call(name: string, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.Expression {
        return Operations.call(this._member(name), ...args);
    }

    normalizeChildren(children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this._call(
            "normalizeChildren",
            Reify.string(this.mode),
            ...children
        ));
    }

    escapeHTML(argument: ESTree.Expression): ESTree.Expression {
        return this._call("escapeHTML", argument);
    }

    isVoidElement(argument: ESTree.Expression): ESTree.Expression {
        return this._call("isVoidElement", argument);
    }

    normalizeAttribute(key: ESTree.Expression, value: ESTree.Expression): ESTree.Expression {
        return this._call("normalizeAttribute", key, value);
    }
}
