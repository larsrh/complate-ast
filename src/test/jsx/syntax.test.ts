import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {
    isMacro,
    normalizeAttribute,
    normalizeAttributes,
    normalizeWhitespace,
    renderAttributes
} from "../../jsx/syntax";

describe("JSX/HTML syntax", () => {

   describe("isMacro", () => {

       it("Upper-case is macro", () => expect(isMacro("Hello")).toBe(true));
       it("Lower-case is not macro", () => expect(isMacro("hello")).toBe(false));
       it("$ is not macro", () => expect(isMacro("$Test")).toBe(false));

   });

   describe("Attribute normalization", () => {

       it("Idempotence", () => {
           fc.assert(fc.property(Gen.attr, attr => {
               const normalized = normalizeAttribute(attr);
               expect(normalizeAttribute(normalized)).toEqual(normalized);
           }));
       });

       it("Idempotence (object)", () => {
           fc.assert(fc.property(Gen.defaultAttrs, attrs => {
               const normalized = normalizeAttributes(attrs);
               expect(normalizeAttributes(normalized)).toEqual(normalized);
           }));
       });

       it("Rendering equivalence", () => {
           fc.assert(fc.property(Gen.defaultAttrs, attrs => {
               const normalized = normalizeAttributes(attrs);
               expect(renderAttributes(normalized)).toEqual(renderAttributes(attrs));
           }));
       });

       it("Leniency", () => {
           expect(normalizeAttribute(10 as any)).toEqual("10");
       });

   });

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

   it("Attribute rendering", () => {
       const attrs = {
           disabled: true,
           class: null,
           id: undefined,
           "data-foo": false,
           "data-bar": "<>\"",
           "data-test": "test"
       };
       const expected = ` disabled data-bar="&lt;&gt;&quot;" data-test="test"`;
       expect(renderAttributes(attrs)).toEqual(expected);
   });

});