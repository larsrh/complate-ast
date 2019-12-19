import {extractAST, parse, preprocess} from "../ast/jsx";
import * as ESTree from "estree";
import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import * as Universal from "../ast/universal";
import {generate} from "escodegen";
import {runInNewContext} from "vm";

function check(name: string, mode: Universal.Kind, jsx: string, expected: Universal.AST, expectStatic?: boolean) {
    describe(name, () => {
        const input = parse(jsx);
        const processed = preprocess(input, mode) as ESTree.Program;

        it("Equivalence", () => {
            const result = runInNewContext(generate(processed), {});
            expect(result).toEqual(expected);
        });

        const name = expectStatic ? "Static" : "Non-static";

        it(name, () => {
            const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
            const extracted = extractAST(inner);
            if (expectStatic)
                expect(extracted).toEqual(expected);
            else
                expect(extracted).toBeNull();
        });
    });
}

const builder = new Structured.ASTBuilder<any>();

describe("Preprocessing (structured)", () => {

    check(
        "Simple wrapped text",
        "structured",
        "<div class='y'>test</div>",
        // TODO replace with object literal
        builder.element("div", {class: "y"}, builder.text("test")),
        true
    );

    check(
        "Computed attribute",
        "structured",
        "<div id={'a' + 'b'}></div>",
        builder.element("div", {id: "ab"})
    );

    check(
        "Computed child",
        "structured",
        "<div>{'a' + 'b'}</div>",
        builder.element("div", {}, builder.prerendered("ab"))
    );

    check(
        "Mixed children",
        "structured",
        "<div>{'a'}<br />{<span />}</div>",
        builder.element(
            "div",
            {},
            builder.prerendered("a"),
            builder.element("br"),
            builder.prerendered(builder.element("span"))
        )
    );

});

describe("Preprocessing (raw)", () => {

    check(
        "Simple wrapped text",
        "raw",
        "<div class='y'>test</div>",
        Raw.create("<div class=\"y\">test</div>"),
        true
    );

    check(
        "Computed attribute",
        "raw",
        "<div id={'a' + 'b'}><span /></div>",
        builder.element("div", {id: "ab"}, builder.prerendered(Raw.astBuilder.element("span")))
    );

    check(
        "Mixed children",
        "raw",
        "<div>{'a'}<br />{<span />}</div>",
        builder.element(
            "div",
            {},
            builder.prerendered("a"),
            builder.prerendered(Raw.astBuilder.element("br")),
            builder.prerendered(Raw.astBuilder.element("span"))
        )
    );

});
