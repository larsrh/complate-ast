import {extractAST, parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import * as Structured from "../../ast/structured";
import {generate} from "escodegen";
import {runInNewContext} from "vm";
import {force, matrix} from "./_util/matrix";
import {JSDOM} from "jsdom";
import {parseHTML} from "../../ast/builders/dom";
import {fromDOM} from "../../ast/builder";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

describe("Preprocessing (examples)", () => {

    matrix((config, astBuilder, esBuilder) => {

        function check(name: string, jsx: string, _expected: Structured.AST | string, expectStatic?: boolean): void {
            const doStatic = expectStatic && esBuilder.canStatic;
            let expected;
            if (typeof _expected === "string") {
                const document = new JSDOM().window.document;
                const node = parseHTML(document, _expected);
                expected = fromDOM(astBuilder, node);
            }
            else {
                expected = Structured.render(_expected, astBuilder);
            }
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
                        // TODO more direct equality
                        expect(force(Structured.render(extracted!, astBuilder))).toEqual(force(expected));
                    else
                        expect(extracted).toBeNull();
                });
            });
        }

        function checkRuntimeFailure(name: string, jsx: string, regex: RegExp): void {
            const sandbox = {JSXRuntime: _JSXRuntime};
            it(name, () => {
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;
                const generated = generate(processed);
                expect(() => force(runInNewContext(generated, sandbox))).toThrow(regex);
            })
        }

        function checkCompileFailure(name: string, jsx: string, regex: RegExp): void {
            it(name, () => {
                const input = parse(jsx);
                expect(() => preprocess(input, esBuilder)).toThrow(regex);
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
            "<div>{ 3 }</div>",
            /invalid child/i
        );

        checkCompileFailure(
            "Statically non-empty void elements",
            "<br>{null}</br>",
            /children/
        );

        check(
            "Dynamic tag",
            `(() => {
                const tag = "h3";
                return <$tag class="foo">abc</$tag>
            })()`,
            Structured.astBuilder.element("h3", {class: "foo"}, Structured.astBuilder.text("abc"))
        );

        if (config.target !== "structured") {

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

        else if (config.mode === "optimizing") { // structured && optimizing

            check(
                "Eliminate void attributes (static)",
                "<span class={null} id={false} />",
                Structured.astBuilder.element("span"),
                true
            );

            check(
                "Keep void attributes",
                "<span class={null} id={false && true} style={undefined} />",
                Structured.astBuilder.element("span", { id: false, style: undefined })
            );

            check(
                "Render true attributes (static)",
                "<button disabled={ true } />",
                Structured.astBuilder.element("button", { disabled: "disabled" }),
                true
            );

            check(
                "Keep true attributes",
                "<button disabled={ true || false } />",
                Structured.astBuilder.element("button", { disabled: true })
            );

        }

        else { // structured && runtime

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

        if (config.target !== "raw") {

            check(
                "Introspection with children",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, {}, child, "hi");
                    return <Test><div /></Test>;
                })()`,
                "<div><div></div>hi</div>"
            );

            check(
                "Introspection overrides attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: "bar" });
                    return <Test><div class="foo" /></Test>;
                })()`,
                "<div class='bar'></div>"
            );

            check(
                "Introspection discards attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: undefined });
                    return <Test><div class="foo" /></Test>;
                })()`,
                "<div></div>"
            );

            check(
                "Introspection respects true attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { disabled: true });
                    return <Test><button /></Test>;
                })()`,
                Structured.astBuilder.element("button", { disabled: true })
            );

            check(
                "Introspection (meta)",
                `(() => {
                    function Add({ attrs, chldrn }, ...children) {
                        return children.map(child =>
                            JSXRuntime.addItems(child, attrs, ...chldrn)
                        );
                    }
                    return <div><Add attrs={ ({ class: "foo" }) } chldrn={ [<span />, "hi"] }><span /><div /></Add></div>;
                })()`,
                "<div><span class='foo'><span></span>hi</span><div class='foo'><span></span>hi</div></div>"
            );

        }

        else {

            checkRuntimeFailure(
                "Introspection",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child);
                    return <Test><div /></Test>;
                })()`,
                /AST kind/
            );

        }

    });


});
