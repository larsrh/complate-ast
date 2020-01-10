import {matrix} from "./_util";
import {spec} from "../../testkit/specs/estreebuilder";
import {esTreeBuilderFromConfig} from "../../jsx/estreebuilders/config";
import {astInfos} from "../../ast";

describe("ESTreeBuilder", () => {

    matrix(config => {

        spec(astInfos[config.target], esTreeBuilderFromConfig(config));

    });

});
