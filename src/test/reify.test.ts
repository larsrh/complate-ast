import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import * as ESTree from "estree";
import {generate} from "escodegen";
import fc, {Arbitrary} from "fast-check";
import * as Reify from "../js/reify";
import {genNoPrerendered, genWithPrerendered} from "../ast/gen";
import {runInNewContext} from "vm";

function checkReify<T>(arb: Arbitrary<T>, reify: (t: T) => ESTree.Expression, post?: (t: T) => any) {
    fc.assert(fc.property(arb, t => {
        const expr = reify(t);
        const stmt: ESTree.ExpressionStatement = {
            expression: expr,
            type: "ExpressionStatement"
        };
        const string = generate(stmt);
        const t2 = runInNewContext(string, {});
        expect(t2).toEqual(post ? post(t) : t);
    }));
}

describe("Reify", () => {

    it("string", () => checkReify(fc.fullUnicodeString(), Reify.string));
    it("any(string)", () => checkReify(fc.fullUnicodeString(), Reify.any));

    it("number", () => checkReify(fc.nat(), Reify.number));
    it("any(number)", () => checkReify(fc.nat(), Reify.any));

    it("object", () => {
        const gen = fc.array(fc.tuple(fc.fullUnicodeString(), fc.fullUnicodeString()));
        checkReify(gen, array =>
            Reify.any(Object.fromEntries(array)),
            array => Object.fromEntries(array)
        );
    });
    it("any(object)", () => {
        const gen = fc.array(fc.tuple(fc.fullUnicodeString(), fc.fullUnicodeString())).map(entries => Object.fromEntries(entries));
        checkReify(gen, Reify.any);
    });

    it("array", () => {
        const gen = fc.array(fc.fullUnicodeString());
        checkReify(gen, array => Reify.array(array.map(x => Reify.string(x))));
    });
    it("any(array)", () => checkReify(fc.array(fc.fullUnicodeString()), Reify.any));

    it("any(raw)", () => {
        const gen = genNoPrerendered(Raw.astBuilder);
        checkReify(gen, Reify.any);
    });

    it("any(structured)", () => {
        const gen = genNoPrerendered(Structured.astBuilder);
        checkReify(gen, Reify.any);
    });

    it("any(structured(raw))", () => {
        const gen = genWithPrerendered(new Structured.ASTBuilder(), genNoPrerendered(Raw.astBuilder));
        checkReify(gen, Reify.any);
    });

    it("function", () => {
        expect(() => Reify.any(() => {})).toThrow(/function/i);
    })

});