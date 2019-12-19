import * as Util from "../util";

describe("Utilities", () => {

   describe("isMacro", () => {

       it("Upper-case is macro", () => expect(Util.isMacro("Hello")).toBe(true));
       it("Lower-case is not macro", () => expect(Util.isMacro("hello")).toBe(false));

   });

});