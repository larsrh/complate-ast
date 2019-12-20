import {isMacro} from "../../jsx/syntax";

describe("JSX/HTML syntax", () => {

   describe("isMacro", () => {

       it("Upper-case is macro", () => expect(isMacro("Hello")).toBe(true));
       it("Lower-case is not macro", () => expect(isMacro("hello")).toBe(false));

   });

});