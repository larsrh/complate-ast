import {Plugin} from "rollup";
import {preprocess} from "../jsx/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {generate} from "astring";
import {RuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";

const defaultESTreeConfig: ESTreeBuilderConfig = {
    target: "raw",
    mode: "optimizing"
};

const defaultRuntimeConfig: RuntimeConfig = {};

export default function complate(
    runtimeConfig: RuntimeConfig = defaultRuntimeConfig,
    esTreeConfig: ESTreeBuilderConfig = defaultESTreeConfig
): Plugin {
    return {
        name: "complate",
        transform(code, id) {
            if (!/\.jsx$/.test(id))
                return;

            const ast = this.parse(code, {});
            const esTreeBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), esTreeConfig);
            return generate(preprocess(ast, esTreeBuilder, runtimeConfig));
        }
    }
}
