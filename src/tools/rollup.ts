import {Plugin} from "rollup";
import {preprocess} from "../jsx/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {generate} from "astring";
import {RuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";

export const defaultESTreeConfig: ESTreeBuilderConfig = {
    target: "raw",
    mode: "optimizing"
};

export const defaultRuntimeConfig: RuntimeConfig = {};

export function complate(
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
            return generate(preprocess(ast, esTreeBuilder));
        }
    }
}
