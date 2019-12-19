import {extractAST, parse, preprocess} from "../ast/jsx";
import * as ESTree from "estree";
import * as Structured from "../ast/structured";
import {generate} from "escodegen";
import {runInNewContext} from "vm";
import {force, matrix} from "./util/roundtrip-matrix";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../runtime/jsx-runtime";

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
                    expect(force(result)).toEqual(force(expected));
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
                expect(() => force(runInNewContext(generated, sandbox))).toThrow();
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
            "Coalesce void children",
            "<div>{null}{false}{undefined}</div>",
            Structured.astBuilder.element("div")
        );

        check(
            "Fragment (implicit)",
            "<div><><br /><span /></></div>",
            Structured.astBuilder.element("div", {},
                Structured.astBuilder.element("br"),
                Structured.astBuilder.element("span"),
            )
        );

        check(
            "Fragment (explicit)",
            `(() => {
                const Fragment = JSXRuntime.Fragment;
                return <div><Fragment><br /><span /></Fragment></div>;
            })()`,
            Structured.astBuilder.element("div", {},
                Structured.astBuilder.element("br"),
                Structured.astBuilder.element("span"),
            )
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
