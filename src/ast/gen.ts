import fc, {Arbitrary} from "fast-check";
import {Builder} from "./builder";

const alphabetic =
    fc.array(fc.integer(0, 25).map(int => String.fromCharCode(int + 97 /* 'a' */)), 10, 20).map(array => array.join(""));

function gen<A, P>(builder: Builder<A, P>, prerenderedGen?: Arbitrary<P>): Arbitrary<A> {
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
        text:
            fc.fullUnicodeString()
                .filter(text =>
                    text.trim() !== "" &&
                        // required for preprocess_roundtrip: strings containing { or } produce JSX parse errors
                        !text.includes('{') &&
                        !text.includes('}') &&
                        // no NUL bytes
                        !text.includes('\u0000')
                )
                .map(text => builder.text(text)),
        prerendered:
            prerenderedGen ?
                prerenderedGen.map(p => builder.prerendered(p)) :
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

export function genNoPrerendered<A>(builder: Builder<A, never>): Arbitrary<A> {
    return gen(builder);
}

export function genWithPrerendered<A, P>(builder: Builder<A, P>, genP: Arbitrary<P>): Arbitrary<A> {
    // TODO test this
    return gen(builder, genP);
}