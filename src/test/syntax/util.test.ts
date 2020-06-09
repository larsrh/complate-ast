import * as Gen from "../../testkit/gen";
import fc from "fast-check";
import {
    HTMLString,
    isMacro,
    normalizeAttribute,
    normalizeAttributes,
    normalizeChildren,
    renderAttributes,
    TextBuilder
} from "../../syntax/util";
import {allKinds, astInfos} from "../../ast";
import {AST} from "../../ast/base";
import {rawText, streamText, structuredText} from "../../ast/_text";

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

   describe("Children normalization", () => {

       describe.each(allKinds)(`%s`, kind => {

           const info = astInfos(kind);
           let textBuilder: TextBuilder<AST>;
           switch (kind) {
               case "structured":
                   textBuilder = structuredText;
                   break;
               case "stream":
                   textBuilder = streamText;
                   break;
               case "raw":
                   textBuilder = rawText;
                   break;
           }

           function norm(...children: any[]): AST[] {
               return normalizeChildren(textBuilder, ...children);
           }

           it("Strings are text nodes", () => {
               fc.assert(fc.property(fc.fullUnicodeString(), string => {
                   const actual = norm(string).map(ast => info.force(ast));
                   const expected = [info.force(info.builder.text(string))];
                   expect(actual).toEqual(expected);
               }))
           });

           it("Raw nodes are prerendered nodes", () => {
               fc.assert(fc.property(fc.fullUnicodeString(), string => {
                   const actual = norm(new HTMLString(string)).map(ast => info.force(ast));
                   const expected = [info.force(info.builder.prerendered(string))];
                   expect(actual).toEqual(expected);
               }))
           });

       });

   });

});