import {matrix, runtimeConfig} from "../_util";
import {spec} from "../../testkit/specs/estreebuilder";
import {astInfos} from "../../ast";
import {esTreeBuilderFromConfig} from "../../preprocess/estreebuilders/config";
import {runtimeModuleFromConfig} from "../../preprocess/runtime";

describe("ESTreeBuilder", () => {

    matrix(config => {

        const esBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), config);

        spec(astInfos(config.target), esBuilder);

    });

});
