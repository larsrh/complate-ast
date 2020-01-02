import * as Stream from "../../ast/stream";

const builder = Stream.astBuilderNoPrerender;

describe("Stream AST", () => {

    describe("Cloning", () => {

        it("Emits extra children", () => {
            const ast1 = builder.element("div");
            const ast2 = Stream._clone(ast1, () => [builder.element("span")], attr => attr);
            expect(Stream.force(ast2)).toEqual("<div><span></span></div>");
        });

        it("Emits extra attributes", () => {
            const ast1 = builder.element("div");
            const ast2 = Stream._clone(ast1, children => children, () => ({ class: "foo" }));
            expect(Stream.force(ast2)).toEqual(`<div class="foo"></div>`);
        });

        it("Extra attributes override existing attributes", () => {
            const ast1 = builder.element("div", { class: "bar" });
            const ast2 = Stream._clone(ast1, children => children, () => ({ class: "foo" }));
            expect(Stream.force(ast2)).toEqual(`<div class="foo"></div>`);
        });

        it("Prevent extra children if not element", () => {
            const ast1 = builder.text("hi");
            const ast2 = Stream._clone(ast1, () => [builder.text("no")], attr => attr);
            expect(() => Stream.force(ast2)).toThrow(/children/);
            const ast3 = Stream._clone(ast2, () => [builder.text("NO")], attr => attr);
            expect(() => Stream.force(ast3)).toThrow(/children/);
        });

        it("Prevent extra attributes if not element", () => {
            const ast1 = builder.text("hi");
            const ast2 = Stream._clone(ast1, children => children, () => ({ class: "foo" }));
            expect(() => Stream.force(ast2)).toThrow(/attributes/);
            const ast3 = Stream._clone(ast2, children => children, () => ({ class: "foo" }));
            expect(() => Stream.force(ast3)).toThrow(/attributes/);
        });

        it("Modifies extra children", () => {
            const ast1 = builder.element("div");
            const ast2 = Stream._clone(ast1, () => [builder.text("no")], attr => attr);
            const ast3 = Stream._clone(ast2, () => [builder.text("yes")], attr => attr);
            expect(Stream.force(ast3)).toEqual("<div>yes</div>");
        });

        it("Modifies extra attributes", () => {
            const ast1 = builder.element("div");
            const ast2 = Stream._clone(ast1, children => children, () => ({ class: "foo" }));
            const ast3 = Stream._clone(ast2, children => children, () => ({ class: "bar" }));
            expect(Stream.force(ast3)).toEqual(`<div class="bar"></div>`);
        });

        it("Cloning creates independent objects", () => {
            const ast = builder.element("div");
            Stream._clone(ast, () => [builder.element("span")], () => ({ class: "foo" }));
            expect(Stream.force(ast)).toEqual("<div></div>");
        });

    });

});