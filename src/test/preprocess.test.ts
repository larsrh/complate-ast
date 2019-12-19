import {ESTreeBuilder, extractAST, OptimizingBuilder, parse, preprocess, RuntimeBuilder} from "../ast/jsx";
import * as ESTree from "estree";
import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import * as Universal from "../ast/universal";
import {generate} from "escodegen";
import {runInNewContext} from "vm";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../runtime/jsx-runtime";

// TODO add stream
const kinds: { [name: string]: Universal.Builder } = {
    "raw": Raw.astBuilder,
    "structured": Structured.astBuilder
};

function builders(kind: Universal.Kind): { [name: string]: ESTreeBuilder } {
    return {
        "runtime": new RuntimeBuilder(kind),
        "optimizing": new OptimizingBuilder(kind)
    };
}

function matrix(
    action: (kind: Universal.Kind, astBuilder: Universal.Builder, name: string, esBuilder: ESTreeBuilder) => void
) {
    for (const [kind, astBuilder] of Object.entries(kinds))
        describe(`Kind: ${kind}`, () => {
            for (const [name, esBuilder] of Object.entries(builders(kind as Universal.Kind /* TODO remove */)))
                describe(`Builder: ${name}`, () => {
                    action(kind as Universal.Kind /* TODO remove */, astBuilder, name, esBuilder);
                });
        });
}

describe("Preprocessing (examples)", () => {

    matrix((kind, astBuilder, name, esBuilder) => {

        function check(name: string, jsx: string, _expected: Structured.AST<never>, expectStatic?: boolean) {
            const doStatic = expectStatic && esBuilder.canStatic;
            const expected = Structured.render(_expected, astBuilder);
            describe(name, () => {
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;

                const sandbox = doStatic ? {} : {JSXRuntime: _JSXRuntime};

                it("Equivalence", () => {
                    const result = runInNewContext(generate(processed), sandbox);
                    expect(result).toEqual(expected);
                });

                const name = doStatic ? "Static" : "Non-static";

                it(name, () => {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    const extracted = extractAST(inner);
                    if (doStatic)
                        expect(extracted).toEqual(expected);
                    else
                        expect(extracted).toBeNull();
                });
            });
        }

        function checkRuntimeFailure(name: string, jsx: string) {
            const sandbox = {JSXRuntime: _JSXRuntime};
            it(name, () => {
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;
                const generated = generate(processed);
                expect(() => runInNewContext(generated, sandbox)).toThrow();
            })
        }


        check(
            "Simple wrapped text",
            "<div class='y'>test</div>",
            // TODO replace with object literal
            Structured.astBuilder.element("div", {class: "y"}, Structured.astBuilder.text("test")),
            true
        );

        check(
            "Computed attribute",
            "<div id={'a' + 'b'}></div>",
            Structured.astBuilder.element("div", {id: "ab"})
        );

        check(
            "Computed child",
            "<div>{'a' + 'b'}</div>",
            Structured.astBuilder.element("div", {}, Structured.astBuilder.text("ab"))
        );

        check(
            "Mixed children",
            "<div>{'a'}<br />{<span />}</div>",
            Structured.astBuilder.element(
                "div",
                {},
                Structured.astBuilder.text("a"),
                Structured.astBuilder.element("br"),
                Structured.astBuilder.element("span")
            )
        );

        check(
            "Mixed children (nested arrays)",
            "<div>{['a', 'b']}<br />{[<span />, <br />]}</div>",
            Structured.astBuilder.element(
                "div",
                {},
                Structured.astBuilder.text("a"),
                Structured.astBuilder.text("b"),
                Structured.astBuilder.element("br"),
                Structured.astBuilder.element("span"),
                Structured.astBuilder.element("br")
            )
        );

        check(
            "Simple IIFE",
            "(() => <div />)()",
            Structured.astBuilder.element("div")
        );

        check(
            "Simple macro",
            `(() => {
                function Div(props, ...children) {
                    return <div>{children}</div>;
                }
                return <Div>abc</Div>
            })()`,
            Structured.astBuilder.element("div", {}, Structured.astBuilder.text("abc"))
        );

        checkRuntimeFailure(
            "Invalid children",
            "<div>{ 3 }</div>"
        );
    });

});
