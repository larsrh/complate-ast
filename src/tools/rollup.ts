import {Plugin} from "rollup";
import {preprocess} from "../preprocess/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../preprocess/estreebuilders/config";
import {RuntimeConfig, runtimeModuleFromConfig} from "../preprocess/runtime";

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
        async transform(code, id) {
            if (!/\.jsx$/.test(id))
                return;

            const {generate} = await import("astring");

            const ast = this.parse(code, {});
            const esTreeBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), esTreeConfig);
            return generate(preprocess(ast, esTreeBuilder, runtimeConfig));
        }
    }
}
