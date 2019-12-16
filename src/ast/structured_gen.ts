import fc, {Arbitrary} from "fast-check";
import {builder, StructuredAST} from "./structured";

const alphabetic =
    fc.array(fc.integer(0, 25).map(int => String.fromCharCode(int + 97 /* 'a' */)), 10, 20).map(array => array.join(""));

function structured<P>(prerenderedGen?: Arbitrary<P>): Arbitrary<StructuredAST<P>> {
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
                return builder.element(tag, Object.fromEntries(attrs), ...(children as StructuredAST<P>[]));
            })
    }));

    return ast as Arbitrary<StructuredAST<P>>;
}

export function structuredNoPrerendered(): Arbitrary<StructuredAST<never>> {
    return structured();
}

export function structuredWithPrerendered<P>(gen: Arbitrary<P>): Arbitrary<StructuredAST<P>> {
    return structured(gen);
}