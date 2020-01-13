import {matrix} from "./_util";
import {spec} from "../../testkit/specs/estreebuilder";
import {astInfos} from "../../ast";

describe("ESTreeBuilder", () => {

    matrix((config, astBuilder, esBuilder) => {

        spec(astInfos[config.target], esBuilder);

    });

});
