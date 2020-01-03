import * as ESTree from "estree";
import {call, identifier, member} from "./operations";

export interface Expr {
    readonly raw: ESTree.Expression;
}

export class ArrayExpr implements ESTree.SpreadElement, Expr {
    readonly type = "SpreadElement";

    constructor(readonly argument: ESTree.Expression) {}

    join(separator: ESTree.Expression): ESTree.CallExpression {
        return call(member(this.argument, identifier("join")), separator);
    }

    map(fn: ESTree.Expression): ArrayExpr {
        return new ArrayExpr(call(member(this.argument, identifier("map")), fn));
    }

    forEach(fn: ESTree.Expression): ESTree.CallExpression {
        return call(member(this.argument, identifier("forEach")), fn);
    }

    get raw(): ESTree.Expression {
        return this.argument;
    }
}
