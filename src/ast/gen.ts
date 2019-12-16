import fc, {Arbitrary} from "fast-check";
import {Builder} from "./builder";

const alphabetic =
    fc.array(fc.integer(0, 25).map(int => String.fromCharCode(int + 97 /* 'a' */)), 10, 20).map(array => array.join(""));

function structured<A, P>(builder: Builder<A, P>, prerenderedGen?: Arbitrary<P>): Arbitrary<A> {
    const { ast } = fc.letrec(tie => ({
        ast:
            fc.frequency(
                ...(
                    prerenderedGen ?
                        [
                            {weight: 2, arbitrary: tie("text")},
                            {weight: 2, arbitrary: tie("prerendered")},
                            {weight: 1, arbitrary: tie("element")}
                        ] :
                        [
                            {weight: 2, arbitrary: tie("text")},
                            {weight: 1, arbitrary: tie("element")}
                        ]
                )
            ),
        text: fc.fullUnicodeString().filter(text => text.trim() !== "").map(builder.text),
        prerendered:
            prerenderedGen ?
                prerenderedGen.map(builder.prerendered) :
                fc.constant(undefined),
        element:
            fc.tuple(
                alphabetic,
                fc.array(fc.tuple(alphabetic, fc.fullUnicodeString())),
                fc.array(tie("ast"), 5)
            ).map(args => {
                const [tag, attrs, children] = args;
                return builder.element(tag, Object.fromEntries(attrs), ...(children as A[]));
            })
    }));

    return ast as Arbitrary<A>;
}

export function structuredNoPrerendered<A>(builder: Builder<A, never>): Arbitrary<A> {
    return structured(builder);
}

export function structuredWithPrerendered<A, P>(builder: Builder<A, P>, gen: Arbitrary<P>): Arbitrary<A> {
    // TODO test this
    return structured(builder, gen);
}