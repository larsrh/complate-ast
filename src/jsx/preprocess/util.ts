import * as ESTree from "estree";
import {isDynamic} from "../syntax";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {ArrayExpr} from "../../estree/expr";
import {Kind} from "../../ast/base";

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

export class Runtime {
    constructor(
        private readonly runtime: ESTree.Expression,
        private readonly mode: Kind
    ) {}

    private member(name: string): ESTree.Expression {
        return Operations.member(this.runtime, Operations.identifier(name));
    }

    private call(name: string, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.Expression {
        return Operations.call(this.member(name), ...args);
    }

    builder(mode: Kind): ESTree.Expression {
        return this.member(`${mode}Builder`);
    }

    normalizeChildren(children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this.call(
            "normalizeChildren",
            Reify.string(this.mode),
            ...children
        ));
    }

    escapeHTML(argument: ESTree.Expression): ESTree.Expression {
        return this.call("escapeHTML", argument);
    }

    get fragment(): ESTree.Expression {
        return this.member("Fragment");
    }

    isVoidElement(argument: ESTree.Expression): ESTree.Expression {
        return this.call("isVoidElement", argument);
    }

    normalizeAttribute(key: ESTree.Expression, value: ESTree.Expression): ESTree.Expression {
        return this.call("normalizeAttribute", key, value);
    }
}
