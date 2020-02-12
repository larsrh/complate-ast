import {Expr} from "../estree/expr";
import fc, {Arbitrary} from "fast-check";
import * as Reify from "reify-to-estree";
import * as Operations from "../estree/operations";
import {AttributeValue} from "../jsx/syntax";

export interface StaticExpr<T> extends Expr {
    readonly value: T;
}

export function literal<T>(arbitrary: Arbitrary<T>): Arbitrary<StaticExpr<T>> {
    return arbitrary.map(t => ({
        raw: Reify.any(t),
        value: t
    }));
}

export interface Arbitraries {
    readonly number: Arbitrary<StaticExpr<number>>;
    readonly string: Arbitrary<StaticExpr<string>>;
    readonly boolean: Arbitrary<StaticExpr<boolean>>;
    readonly nul: Arbitrary<StaticExpr<null>>;
    readonly undef: Arbitrary<StaticExpr<undefined>>;
}

export const literals: Arbitraries = {
    number: literal(fc.oneof(fc.integer(), fc.float())),
    string: literal(fc.fullUnicodeString()),
    boolean: literal(fc.boolean()),
    nul: literal(fc.constant(null)),
    undef: literal(fc.constant(undefined))
};

function plus<T extends number | string>(arb: Arbitrary<StaticExpr<T>>): Arbitrary<StaticExpr<T>> {
    return arb.chain(n1 => arb.map(n2 => ({
        // @ts-ignore
        value: n1.value + n2.value,
        raw: Operations.plus(n1.raw, n2.raw)
    })));
}

function length(arb: Arbitrary<StaticExpr<string>>): Arbitrary<StaticExpr<number>> {
    return arb.map(s => ({ value: s.value.length, raw: Operations.member(s.raw, Operations.identifier("length")) }));
}

function toString(arb: Arbitrary<StaticExpr<number>>): Arbitrary<StaticExpr<string>> {
    return arb.map(n => ({ value: `${n.value}`, raw: Operations.call(Operations.member(n.raw, Operations.identifier("toString"))) }));
}

function expressions(): Arbitraries {
    return fc.letrec(tie => ({
        number:
            fc.frequency(
                { weight: 3, arbitrary: literals.number },
                { weight: 1, arbitrary: plus(tie("number") as Arbitrary<StaticExpr<number>>) },
                { weight: 1, arbitrary: length(tie("string") as Arbitrary<StaticExpr<string>>) }
        ),
        string:
            fc.frequency(
                { weight: 3, arbitrary: literals.string },
                { weight: 1, arbitrary: plus(tie("string") as Arbitrary<StaticExpr<string>>) },
                { weight: 1, arbitrary: toString(tie("number") as Arbitrary<StaticExpr<number>>) }
            ),
        boolean:
            fc.frequency(
                { weight: 3, arbitrary: literals.boolean }
            ),
        nul:
            fc.frequency(
                { weight: 3, arbitrary: literals.nul }
            ),
        undef:
            fc.frequency(
                { weight: 3, arbitrary: literals.undef }
            )
    })) as Arbitraries;
}

export const exprs: Arbitraries = expressions();

export function attributeValue(arbitraries: Arbitraries): Arbitrary<StaticExpr<AttributeValue>> {
    return fc.oneof<StaticExpr<AttributeValue>>(
        arbitraries.string,
        arbitraries.boolean,
        arbitraries.nul,
        arbitraries.undef
    );
}