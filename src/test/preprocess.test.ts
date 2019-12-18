import {extractAST, parse, preprocess} from "../ast/jsx";
import * as ESTree from "estree";
import * as Structured from "../ast/structured";
import {generate} from "escodegen";

describe("Preprocessing (structured)", () => {

    const builder = Structured.astBuilder;

    function check(name: string, jsx: string, expected: Structured.AST<never>, expectStatic?: boolean) {
        describe(name, () => {
            const input = parse(jsx);

            it("Equivalence", () => {
                const result = eval(generate(preprocess(input, "structured")));
                expect(result).toEqual(expected);
            });

            const name = expectStatic ? "Static" : "Non-static";

            it(name, () => {
                const processed = preprocess(input, "structured") as ESTree.Program;
                const inner = (processed.body[0] as ESTree.ExpressionStatement).expression;
                const extracted = extractAST(inner);
                if (expectStatic)
                    expect(extracted).toEqual(expected);
                else
                    expect(extracted).toBeNull();
            });
        });
    }

    check(
        "Simple wrapped text",
        "<div class='y'>test</div>",
        builder.element("div", {class: "y"}, builder.text("test")),
        true
    );

    check(
        "Attribute with literal",
        "<div id={'z'}></div>",
        builder.element("div", {id: "z"}),
        true
    );

    check(
        "Computed attribute",
        "<div id={'a' + 'b'}></div>",
        builder.element("div", {id: "ab"})
    );

});
