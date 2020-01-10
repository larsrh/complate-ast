import fc, {Arbitrary} from "fast-check";
import {Attributes, AttributeValue} from "../jsx/syntax";
import {Builder} from "../ast/builder";

// TODO dashes
const alphabetic =
    fc.array(
        fc.integer(0, 25).map(int => String.fromCharCode(int + 97 /* 'a' */)),
        10,
        20
    ).map(array => array.join(""));

export const attr: Arbitrary<AttributeValue> = fc.oneof<AttributeValue>(
    fc.fullUnicodeString(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined)
);

export function attrs<AV>(attr: Arbitrary<AV>): Arbitrary<Attributes<AV>> {
    return fc.array(fc.tuple(alphabetic, attr)).map(attrs => Object.fromEntries(attrs));
}

export const defaultAttrs: Arbitrary<Attributes> = attrs(attr);

export function ast<A, P, AV>(
    builder: Builder<A, P, AV>,
    attrGen: Arbitrary<AV>,
    prerenderedGen?: Arbitrary<P>
): Arbitrary<A> {
    const fullAttrGen: Arbitrary<AV> = fc.oneof(
        attrGen,
        attr.map(value => builder.attributeValue(value))
    );
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
                attrs(fullAttrGen),
                fc.array(tie("ast"), 5)
            ).map(args => {
                const [tag, attrs, children] = args;
                return builder.element(tag, attrs, ...(children as A[]));
            })
    }));

    return ast as Arbitrary<A>;
}

export function defaultAST<A>(builder: Builder<A>): Arbitrary<A> {
    return ast(builder, attr);
}
