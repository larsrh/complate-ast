import {normalizeWhitespace, preprocess} from "../../preprocess/preprocess";
import {AST} from "../../ast/base";
import * as ESTree from "estree-jsx";
import * as Structured from "../../ast/structured";
import {generate} from "astring";
import {runInNewContext} from "vm";
import {matrix, runtimeConfig} from "../_util";
import {addItems, astInfos, renderToString} from "../../ast";
import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {CompactingBuilder} from "../../ast/builders/compact";
import * as Raw from "../../ast/raw";
import * as JSXRuntime from "../../runtime";
import {esTreeBuilderFromConfig} from "../../preprocess/estreebuilders/config";
import {runtimeModuleFromConfig} from "../../preprocess/runtime";
import {Parser} from "acorn";
import jsx from "acorn-jsx";
import {fromDOM, parseHTML} from "../../testkit/dom";
import {Fragment, safe} from "../../runtime";

const parser = Parser.extend(jsx());

// TODO golden tests
describe("Preprocessing", () => {

    describe("Whitespace normalization", () => {
        // <https://reactjs.org/docs/jsx-in-depth.html#string-literals-1>
        const whitespaceExamples: Record<string, string> = {
            none: "Hello World",
            simple: "\n  Hello World\n",
            inner: "\n  Hello\n  World\n",
            extra: "\n\n  Hello World\n"
        };

        it.each(Object.keys(whitespaceExamples))(`%s`, key => {
            expect(normalizeWhitespace(whitespaceExamples[key])).toEqual("Hello World");
        });
    });

    matrix(config => {

        const astBuilder = astInfos(config.target).builder;
        const force = astInfos(config.target).force;
        const esBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), config);

        function check(name: string, jsx: string, _expected: Structured.AST<string> | string, expectStatic = false): void {
            const doStatic = expectStatic && esBuilder.canStatic;
            let expected: AST;
            if (typeof _expected === "string") {
                const node = parseHTML(window.document, _expected);
                expected = fromDOM(astBuilder, node);
            }
            else {
                expected = Structured.render(_expected, astBuilder);
            }
            describe(name, () => {
                const input = parser.parse(jsx);
                const processed = preprocess(input, esBuilder, runtimeConfig) as ESTree.Program;

                const sandbox = doStatic ? {} : { Complate: JSXRuntime, Fragment, addItems, safe };

                it("Equivalence", () => {
                    const result = runInNewContext(generate(processed), sandbox);
                    expect(force(result)).toEqual(force(expected));
                    expect(renderToString(config.target, result)).toEqual(renderToString(config.target, expected));
                });

                const name = doStatic ? "Static" : "Non-static";

                it(name, () => {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    if (doStatic)
                        expect(inner).toHaveProperty("_staticAST", _expected);
                    else
                        expect(inner).not.toHaveProperty("_staticAST");
                });
            });
        }

        function checkRuntimeFailure(name: string, jsx: string, regex: RegExp): void {
            const sandbox = { Complate: JSXRuntime, addItems };
            it(name, () => {
                const input = parser.parse(jsx);
                const processed = preprocess(input, esBuilder, runtimeConfig) as ESTree.Program;
                const generated = generate(processed);
                expect(() => force(runInNewContext(generated, sandbox))).toThrow(regex);
            })
        }

        function checkCompileFailure(name: string, jsx: string, regex: RegExp): void {
            it(name, () => {
                const input = parser.parse(jsx);
                expect(() => preprocess(input, esBuilder, runtimeConfig)).toThrow(regex);
            })
        }

        const builder = new Structured.ASTBuilder<string>();

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
            ),
            true
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
            `<div><Fragment><br /><span /></Fragment></div>`,
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
                    return <div>{[...children].reverse()}</div>;
                }
                return <RDiv>abc<span>def</span></RDiv>
            })()`,
            builder.element("div", {},
                builder.element("span", {}, builder.text("def")),
                builder.text("abc")
            )
        );

        it("Macro children and props", () => {
            const expected = astBuilder.element("div", {},
                astBuilder.prerendered("<br>"),
                astBuilder.text("<"),
                astBuilder.text("true"),
                astBuilder.text("testd"),
                astBuilder.text("testc"),
                astBuilder.text("testb"),
                astBuilder.text("testa"),
                astBuilder.element("span")
            );

            const input = parser.parse(`
                <div>
                    <Macro1>
                        <Macro2
                            test1="a" test2={ 3 } test3={ null } test4={ false } test5={ true }
                            {...{ test6: "b", test7: null, test8: false }} test8="c" test9={ '"' }>
                            <span />
                            testa
                            { "testb" }
                            { ["testc", "testd"] }
                            { [null, false, true, undefined, "<" ] }
                            <__UnsafeRaw html={"<br>"} />
                        </Macro2>
                    </Macro1>
                </div>
            `);

            const processed = preprocess(input, esBuilder, runtimeConfig) as ESTree.Program;

            const macro1 = jest.fn((props: object, ...children: any[]) => children);
            const macro2 = jest.fn((props: object, ...children: any[]) => [...children].reverse());

            const sandbox = { Complate: JSXRuntime, Macro1: macro1, Macro2: macro2 };

            const result = runInNewContext(generate(processed), sandbox);

            expect(force(result)).toEqual(force(expected));

            expect(macro1).toHaveBeenCalledTimes(1);
            expect(macro2).toHaveBeenCalledTimes(1);

            const macro1Call = macro1.mock.calls[0];
            expect(macro1Call[0]).toEqual({});
            expect(macro1Call.slice(1, 8)).toEqual([
                safe("<br>"),
                "<",
                true,
                "testd",
                "testc",
                "testb",
                "testa"
            ]);
            expect(force(macro1Call[8])).toEqual(force(astBuilder.element("span")));

            const macro2Call = macro2.mock.calls[0];
            expect(macro2Call[0]).toEqual({
                test1: "a",
                test2: 3,
                test3: null,
                test4: false,
                test5: true,
                test6: "b",
                test7: null,
                test8: "c",
                test9: '"'
            });
            expect(force(macro2Call[1])).toEqual(force(astBuilder.element("span")));
            expect(macro2Call.slice(2)).toEqual([
                "testa",
                "testb",
                "testc",
                "testd",
                true,
                "<",
                safe("<br>")
            ]);
        });

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
                    const Test = (props, child) => addItems(child, {}, child, "hi");
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
                    const Test = (props, child) => addItems(child, { class: "bar" });
                    return <Test><div class="foo" /></Test>;
                })()`,
                builder.element("div", { class: "bar" })
            );

            check(
                "Introspection discards attributes",
                `(() => {
                    const Test = (props, child) => addItems(child, { class: undefined });
                    return <Test><div class="foo" /></Test>;
                })()`,
                builder.element("div")
            );

            check(
                "Introspection respects true attributes",
                `(() => {
                    const Test = (props, child) => addItems(child, { disabled: true });
                    return <Test><button /></Test>;
                })()`,
                builder.element("button", { disabled: true })
            );

            check(
                "Introspection with spread attributes",
                `(() => {
                    const Test = (props, child) => addItems(child, { class: "bar" });
                    return <Test><div {...{ class: "foo" }} /></Test>;
                })()`,
                builder.element("div", { class: "bar" })
            );

            check(
                "Introspection with spread attributes discards",
                `(() => {
                    const Test = (props, child) => addItems(child, { class: undefined });
                    return <Test><div {...{ class: "foo" }} /></Test>;
                })()`,
                builder.element("div")
            );

            check(
                "Introspection with spread attributes respects true attrributes",
                `(() => {
                    const Test = (props, child) => addItems(child, { disabled: true });
                    return <Test><button {...{ disabled: false }} /></Test>;
                })()`,
                builder.element("button", { disabled: true })
            );

            check(
                "Introspection (meta)",
                `(() => {
                    function Add({ attrs, chldrn }, ...children) {
                        return children.map(child =>
                            addItems(child, attrs, ...chldrn)
                        );
                    }
                    return <div><Add attrs={ ({ class: "foo" }) } chldrn={ [<span />, "hi"] }><span /><div /></Add></div>;
                })()`,
                "<div><span class='foo'><span></span>hi</span><div class='foo'><span></span>hi</div></div>"
            );

            check(
                "Introspection with non-AST children",
                `(() => {
                    const WithSafe = ({ text }, child) => addItems(child, {}, safe(text));
                    return <WithSafe text="<br>"><div></div></WithSafe>
                })()`,
                builder.element("div", {}, builder.prerendered("<br>"))
            );

        }

        else {

            checkRuntimeFailure(
                "Introspection",
                `(() => {
                    const Test = (props, child) => addItems(child);
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
            const gen = Gen.defaultAST(Structured.info().builder).filter(ast => ast.nodeType !== "text");
            const sandbox = esBuilder.canStatic ? {} : { Complate: JSXRuntime };

            fc.assert(fc.property(gen, ast => {
                const ast1 = Structured.render(
                    Structured.render(ast, new CompactingBuilder()),
                    astBuilder
                );

                const jsx = Structured.render(ast, Raw.info().builder).value;
                const input = parser.parse(jsx);
                const processed = preprocess(input, esBuilder, runtimeConfig) as ESTree.Program;

                const ast2 = runInNewContext(generate(processed), sandbox);
                expect(force(ast2)).toEqual(force(ast1));

                if (esBuilder.canStatic) {
                    const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                    expect(inner).toHaveProperty("_staticAST", Structured.render(ast, new CompactingBuilder()));
                }
            }));
        });

    });

});
