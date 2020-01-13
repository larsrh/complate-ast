import {parse, preprocess} from "../../jsx/preprocess";
import * as ESTree from "estree";
import * as Structured from "../../ast/structured";
import {generate} from "astring";
import {runInNewContext} from "vm";
import {matrix} from "./_util";
import {force} from "../../ast";
import {fromDOM, parseHTML} from "../../ast/builders/dom";
import {extractAST} from "../../jsx/estreebuilders/util";
import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {CompactingBuilder} from "../../ast/builders/compact";
import * as Raw from "../../ast/raw";

// underscored to test correct scoping (generated code references `JSXRuntime`)
import * as _JSXRuntime from "../../runtime";

// TODO golden tests
describe("Preprocessing", () => {

    matrix((config, astBuilder, esBuilder) => {

        function check(name: string, jsx: string, _expected: Structured.AST | string, expectStatic = false): void {
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
                        expect(extracted).toEqual(_expected);
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
            "Overriding attributes (static)",
            "<span class='a' class='b' />",
            builder.element("span", { class: "b" }),
            true
        );

        check(
            "Overriding attributes (mixed static/dynamic)",
            "<span class='a' class={ 'b' + '' } />",
            builder.element("span", { class: "b" })
        );

        check(
            "Overriding attributes (mixed dynamic/static)",
            "<span  class={ 'b' + '' } class='a' />",
            builder.element("span", { class: "a" }),
            true
        );

        check(
            "Overriding attributes",
            "<span  class={ 'b' + '' } class={ 'a' + '' } />",
            builder.element("span", { class: "a" })
        );

        check(
            "Overriding attributes with cancellation (static)",
            "<button disabled disabled={ null } />",
            builder.element("button"),
            true
        );

        check(
            "Overriding attributes with cancellation",
            "<button disabled disabled={ undefined } />",
            builder.element("button")
        );

        check(
            "Attributes with dashes (static)",
            "<span data-foo='bar' />",
            builder.element("span", { "data-foo": "bar" }),
            true
        );

        check(
            "Attributes with dashes",
            "<span data-foo={ 'ba' + 'r' } />",
            builder.element("span", { "data-foo": "bar" })
        );

        check(
            "True attributes with dashes",
            "<span data-foo />",
            builder.element("span", { "data-foo": true }),
            true
        );

        check(
            "Number-valued attributes (static)",
            "<span data-foo={ 10 } />",
            builder.element("span", { "data-foo": "10" }),
            true
        );

        check(
            "Number-valued attributes",
            "<span data-foo={ 5 + 5 } />",
            builder.element("span", { "data-foo": "10" })
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
            builder.element( "br", { class: "foo" }),
            true
        );

        check(
            "Void element with computed attribute",
            "<br class={'fo' + 'o'} />",
            builder.element( "br", { class: "foo" })
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
            "Spread attributes",
            "<span {...{ class: 'foo', id: 'bar' }} />",
            builder.element("span", { class: "foo", id: "bar" })
        );

        check(
            "Overriding spread attributes (static)",
            "<span class='foo1' {...{ class: 'foo2', id: 'bar' }} />",
            builder.element("span", { class: "foo2", id: "bar" })
        );

        check(
            "Overriding spread attributes",
            "<span class={ 'foo' + '1' } {...{ class: 'foo2', id: 'bar' }} />",
            builder.element("span", { class: "foo2", id: "bar" })
        );

        check(
            "Overriden spread attributes (static)",
            "<span class='foo1' {...{ class: 'foo2', id: 'bar1' }} id='bar2' />",
            builder.element("span", { class: "foo2", id: "bar2" })
        );

        check(
            "Overriden spread attributes with cancellation (static)",
            "<span {...{ class: 'foo', id: 'bar' }} class={ null } />",
            builder.element("span", { id: "bar" })
        );

        check(
            "Overriden spread attributes with cancellation",
            "<span {...{ class: 'foo', id: 'bar' }} class={ undefined } />",
            builder.element("span", { id: "bar" })
        );

        check(
            "Overriding spread attributes",
            "<span class={ 'foo' + '1' } {...{ class: 'foo2', id: 'bar1' }} id={ 'bar' + '2' } />",
            builder.element("span", { class: "foo2", id: "bar2" })
        );

        check(
            "Multiple spread attributes",
            "<span {...{ class: 'foo1', id: 'bar' }} {...{ class: 'foo2', 'data-foo': 'test' }} />",
            builder.element("span", { class: "foo2", id: "bar", "data-foo": "test" })
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

        check(
            "Shorthand for true attribute",
            "<button disabled />",
            builder.element("button", { disabled: true }),
            true
        );

        check(
            "Eliminate void attributes (static)",
            "<span class={null} id={false} />",
            builder.element("span"),
            true
        );

        check(
            "Render true attributes (static)",
            "<button disabled={ true } />",
            builder.element("button", { disabled: true }),
            true
        );

        check(
            "Keep true attributes",
            "<button disabled={ true || false } />",
            builder.element("button", { disabled: true })
        );

        check(
            "Eliminate void attributes",
            "<span class={null} id={false && true} style={undefined} />",
            builder.element("span")
        );

        if (config.target !== "raw") {

            check(
                "Introspection with children",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, {}, child, "hi");
                    return <Test><div /></Test>;
                })()`,
                builder.element(
                    "div",
                    {},
                    builder.element("div"),
                    builder.text("hi")
                )
            );

            check(
                "Introspection overrides attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: "bar" });
                    return <Test><div class="foo" /></Test>;
                })()`,
                builder.element("div", { class: "bar" })
            );

            check(
                "Introspection discards attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: undefined });
                    return <Test><div class="foo" /></Test>;
                })()`,
                builder.element("div")
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
                "Introspection with spread attributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: "bar" });
                    return <Test><div {...{ class: "foo" }} /></Test>;
                })()`,
                builder.element("div", { class: "bar" })
            );

            check(
                "Introspection with spread attributes discards",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { class: undefined });
                    return <Test><div {...{ class: "foo" }} /></Test>;
                })()`,
                builder.element("div")
            );

            check(
                "Introspection with spread attributes respects true attrributes",
                `(() => {
                    const Test = (props, child) => JSXRuntime.addItems(child, { disabled: true });
                    return <Test><button {...{ disabled: false }} /></Test>;
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
                /does not support/
            );

        }

        /*
         * structured AST (gen) -[compact]-> structured AST † -[render]-> target AST
         *       |
         *       | [render]
         *       v
         *    raw AST
         *       |
         *       | [parse]                                                   ===
         *       v
         *    ESTree
         *       |
         *       | [preprocess]
         *       v
         *    ESTree ‡    -------------[eval]-------------------------->  target AST
         *
         *
         * Additional property if esBuilder.canStatic:
         *   static(‡) === †
         */
        it("Roundtrip (Structured → JSX → ESTree → Preprocess → AST)", () => {
            const gen = Gen.defaultAST(Structured.info.builder).filter(ast => ast.nodeType !== "text");
            const sandbox = esBuilder.canStatic ? {} : {JSXRuntime: _JSXRuntime};

            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    astBuilder
                );

                const jsx = Structured.render(ast, Raw.info.builder).value;
                const input = parse(jsx);
                const processed = preprocess(input, esBuilder) as ESTree.Program;

                const ast2 = runInNewContext(generate(processed), sandbox);
                expect(force(ast2)).toEqual(force(ast1));

                if (esBuilder.canStatic) {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    const extracted = extractAST(inner);
                    expect(extracted).toEqual(Structured.render(ast, new CompactingBuilder()));
                }
            }));
        });

    });


});
