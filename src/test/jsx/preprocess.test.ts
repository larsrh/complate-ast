import {extractAST, parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import * as Structured from "../../ast/structured";
import {generate} from "escodegen";
import {runInNewContext} from "vm";
import {force, matrix} from "./_util/matrix";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

describe("Preprocessing (examples)", () => {

    matrix((kind, astBuilder, name, esBuilder) => {

        function check(name: string, jsx: string, _expected: Structured.AST<never>, expectStatic?: boolean): void {
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

        function checkRuntimeFailure(name: string, jsx: string): void {
            const sandbox = {JSXRuntime: _JSXRuntime};
            it(name, () => {
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;
                const generated = generate(processed);
                expect(() => force(runInNewContext(generated, sandbox))).toThrow();
            })
        }

        function checkCompileFailure(name: string, jsx: string): void {
            it(name, () => {
                const input = parse(jsx);
                expect(() => preprocess(input, esBuilder)).toThrow();
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
            "Void element with attribute",
            "<br class='foo' />",
            Structured.astBuilder.element( "br", {class: "foo"}),
            true
        );

        check(
            "Void element with computed attribute",
            "<br class={'fo' + 'o'} />",
            Structured.astBuilder.element( "br", {class: "foo"})
        );

        check(
            "Void element but not self-closing",
            "<br></br>",
            Structured.astBuilder.element("br"),
            true
        );

        check(
            "Simple IIFE",
            "(() => <div />)()",
            Structured.astBuilder.element("div")
        );

        check(
            "Eliminate void children",
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

        check(
            "Complex macro",
            `(() => {
                function RDiv(props, ...children) {
                    return <div>{children.reverse()}</div>;
                }
                return <RDiv>abc<span>def</span></RDiv>
            })()`,
            Structured.astBuilder.element("div", {},
                Structured.astBuilder.element("span", {}, Structured.astBuilder.text("def")),
                Structured.astBuilder.text("abc")
            )
        );

        checkRuntimeFailure(
            "Invalid children",
            "<div>{ 3 }</div>"
        );

        checkCompileFailure(
            "Statically non-empty void elements",
            "<br>{null}</br>"
        );

        describe("Kind-specific", () => {

            if (kind !== "structured") {

                check(
                    "Eliminate void attributes (static)",
                    "<span class={null} id={false} />",
                    Structured.astBuilder.element("span"),
                    true
                );

                check(
                    "Eliminate void attributes",
                    "<span class={null} id={false && true} style={undefined} />",
                    Structured.astBuilder.element("span")
                );

                check(
                    "Render true attributes (static)",
                    "<button disabled={ true } />",
                    Structured.astBuilder.element("button", { disabled: "disabled" }),
                    true
                );

                check(
                    "Render true attributes",
                    "<button disabled={ true || false } />",
                    Structured.astBuilder.element("button", { disabled: "disabled" })
                );

            }

            else {

                check(
                    "Keep void attributes (static)",
                    "<span class={null} id={false} />",
                    Structured.astBuilder.element("span", { class: null, id: false }),
                    true
                );

                check(
                    "Keep void attributes",
                    "<span class={null} id={false && true} style={undefined} />",
                    Structured.astBuilder.element("span", { class: null, id: false, style: undefined })
                );

                check(
                    "Keep true attributes (static)",
                    "<button disabled={ true } />",
                    Structured.astBuilder.element("button", { disabled: true }),
                    true
                );

                check(
                    "Keep true attributes",
                    "<button disabled={ true || false } />",
                    Structured.astBuilder.element("button", { disabled: true })
                );

            }

        });

        describe("Builder-specific", () => {

            if (name !== "runtime") {

                describe("Dynamic tags", () => {

                    check(
                        "Simple",
                        `(() => {
                            const tag = "h3";
                            return <$tag class="foo">abc</$tag>
                        })()`,
                        Structured.astBuilder.element("h3", {class: "foo"}, Structured.astBuilder.text("abc"))
                    );

                    describe.skip("Void check", () => {

                        checkRuntimeFailure(
                            "Void check",
                            `(() => {
                            const tag = "br";
                            return <$tag>abc</$tag>
                        })()`
                        );

                    });

                });

            }

            else {

                checkCompileFailure(
                    "Dynamic tags",
                    "<$tag />"
                )

            }

        });

    });


});
