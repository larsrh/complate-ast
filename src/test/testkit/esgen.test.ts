import {spec} from "../../testkit/specs/esgen";
import * as ESGen from "../../testkit/esgen";

describe("ESGen", () => {

    describe("Literals", () => {

        for (const [name, arb] of Object.entries(ESGen.literals))
            spec(name, arb);

    });

    describe("Expressions", () => {

        for (const [name, arb] of Object.entries(ESGen.exprs))
            spec(name, arb);

    });

});