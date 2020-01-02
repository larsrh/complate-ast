import fc, {Arbitrary} from "fast-check";
import {Builder} from "./builder";
import {Attributes, AttributeValue} from "../jsx/syntax";

const alphabetic =
    fc.array(fc.integer(0, 25).map(int => String.fromCharCode(int + 97 /* 'a' */)), 10, 20).map(array => array.join(""));

export const attr: Arbitrary<AttributeValue> = fc.oneof<AttributeValue>(
    fc.fullUnicodeString(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined)
);

export const attrs: Arbitrary<Attributes> =
    fc.array(fc.tuple(alphabetic, attr)).map(attrs => Object.fromEntries(attrs));

function ast<A, P>(builder: Builder<A, P>, prerenderedGen?: Arbitrary<P>): Arbitrary<A> {
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
                attrs,
                fc.array(tie("ast"), 5)
            ).map(args => {
                const [tag, attrs, children] = args;
                return builder.element(tag, attrs, ...(children as A[]));
            })
    }));

    return ast as Arbitrary<A>;
}

export function astNoPrerendered<A>(builder: Builder<A, never>): Arbitrary<A> {
    return ast(builder);
}

export function astWithPrerendered<A, P>(builder: Builder<A, P>, genP: Arbitrary<P>): Arbitrary<A> {
    // TODO test this
    return ast(builder, genP);
}