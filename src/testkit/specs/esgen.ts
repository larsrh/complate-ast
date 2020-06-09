import fc, {Arbitrary} from "fast-check";
import {StaticExpr} from "../esgen";
import {runInNewContext} from "vm";
import {expressionStatement} from "../../syntax/operations";
import {generate} from "astring";

export function spec<T>(name: string, arb: Arbitrary<StaticExpr<T>>): void {
    it(name, () => {
        fc.assert(fc.property(arb, expr => {
            const js = generate(expressionStatement(expr.raw));
            expect(runInNewContext(js, {})).toEqual(expr.value);
        }));
    });
}