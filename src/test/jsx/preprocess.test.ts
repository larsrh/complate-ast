import {extractAST, parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import * as Structured from "../../ast/structured";
import {generate} from "astring";
import {runInNewContext} from "vm";
import {matrix} from "./_util/matrix";
import {force} from "../../ast";
import {fromDOM, parseHTML} from "../../ast/builders/dom";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../jsx/runtime";

describe("Preprocessing (examples)", () => {

    matrix((config, astBuilder, esBuilder) => {

        function check(name: string, jsx: string, _expected: Structured.AST | string, expectStatic?: boolean): void {
            const doStatic = expectStatic && esBuilder.canStatic;
            let expected;
            if (typeof _expected === "string") {
                const node = parseHTML(window.document, _expected);
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

        const builder = Structured.info.builder;

        check(
            "Simple wrapped text",
            "<div class='y'>test</div>",
            builder.element("div", {class: "y"}, builder.text("test")),
            true
        );

        check(
            "Computed attribute",
            "<div id={'a' + 'b'}></div>",
            builder.element("div", {id: "ab"})
        );

        check(
            "Computed child",
            "<div>{'a' + 'b'}</div>",
            builder.element("div", {}, builder.text("ab"))
        );

        check(
            "Mixed children",
            "<div>{'a'}<br />{<span />}</div>",
            builder.element(
                "div",
                {},
                builder.text("a"),
                builder.element("br"),
                builder.element("span")
            )
        );

        check(
            "Mixed children (nested arrays)",
            "<div>{['a', 'b']}<br />{[<span />, <br />]}</div>",
            builder.element(
                "div",
                {},
                builder.text("a"),
                builder.text("b"),
                builder.element("br"),
                builder.element("span"),
                builder.element("br")
            )
        );

        check(
            "Void element with attribute",
            "<br class='foo' />",
            builder.element( "br", {class: "foo"}),
            true
        );

        check(
            "Void element with computed attribute",
            "<br class={'fo' + 'o'} />",
            builder.element( "br", {class: "foo"})
        );

        check(
            "Void element but not self-closing",
            "<br></br>",
            builder.element("br"),
            true
        );

        check(
            "Correct HTML escaping",
            `<span data-foo={ "'<&" }>{ ['"', "'", '<', '&'].join("") }</span>`,
            builder.element("span", { "data-foo": "'<&" }, builder.text(`"'<&`))
        );

        check(
            "Simple IIFE",
            "(() => <div />)()",
            builder.element("div")
        );

        check(
            "Eliminate void children",
            "<div>{null}{false}{undefined}</div>",
            builder.element("div")
        );

        check(
            "Fragment (implicit)",
            "<div><><br /><span /></></div>",
            builder.element("div", {},
                builder.element("br"),
                builder.element("span"),
            )
        );

        check(
            "Fragment (explicit)",
            `(() => {
                const Fragment = JSXRuntime.Fragment;
                return <div><Fragment><br /><span /></Fragment></div>;
            })()`,
            builder.element("div", {},
                builder.element("br"),
                builder.element("span"),
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
            builder.element("div", {}, builder.text("abc"))
        );

        check(
            "Complex macro",
            `(() => {
                function RDiv(props, ...children) {
                    return <div>{children.reverse()}</div>;
                }
                return <RDiv>abc<span>def</span></RDiv>
            })()`,
            builder.element("div", {},
                builder.element("span", {}, builder.text("def")),
                builder.text("abc")
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
            builder.element("h3", {class: "foo"}, builder.text("abc"))
        );

        if (config.target !== "structured") {

            check(
                "Eliminate void attributes (static)",
                "<span class={null} id={false} />",
                builder.element("span"),
                true
            );

            check(
                "Eliminate void attributes",
                "<span class={null} id={false && true} style={undefined} />",
                builder.element("span")
            );

            check(
                "Render true attributes (static)",
                "<button disabled={ true } />",
                builder.element("button", { disabled: "disabled" }),
                true
            );

            check(
                "Render true attributes",
                "<button disabled={ true || false } />",
                builder.element("button", { disabled: "disabled" })
            );

            check(
                "Shorthand for true attribute",
                "<button disabled />",
                builder.element("button", { disabled: "disabled" }),
                true
            );

        }

        else if (config.mode === "optimizing") { // structured && optimizing

            check(
                "Eliminate void attributes (static)",
                "<span class={null} id={false} />",
                builder.element("span"),
                true
            );

            check(
                "Keep void attributes",
                "<span class={null} id={false && true} style={undefined} />",
                builder.element("span", { id: false, style: undefined })
            );

            check(
                "Render true attributes (static)",
                "<button disabled={ true } />",
                builder.element("button", { disabled: "disabled" }),
                true
            );

            check(
                "Keep true attributes",
                "<button disabled={ true || false } />",
                builder.element("button", { disabled: true })
            );

            check(
                "Shorthand for true attribute",
                "<button disabled />",
                builder.element("button", { disabled: "disabled" }),
                true
            );

        }

        else { // structured && runtime

            check(
                "Keep void attributes (static)",
                "<span class={null} id={false} />",
                builder.element("span", { class: null, id: false })
            );

            check(
                "Keep void attributes",
                "<span class={null} id={false && true} style={undefined} />",
                builder.element("span", { class: null, id: false, style: undefined })
            );

            check(
                "Keep true attributes (static)",
                "<button disabled={ true } />",
                builder.element("button", { disabled: true })
            );

            check(
                "Keep true attributes",
                "<button disabled={ true || false } />",
                builder.element("button", { disabled: true })
            );

            check(
                "Shorthand for true attribute",
                "<button disabled />",
                builder.element("button", { disabled: true })
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
                builder.element("button", { disabled: true })
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
                /Raw AST/
            );

        }

    });


});
