import {Event, Suite} from "benchmark";
import {parse, preprocess} from "../jsx/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {defaultRuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";
import {generate} from "astring";
import * as sucrase from "sucrase";
import * as babel from "@babel/core";
import {allConfigs} from "../test/_util";

const suite = new Suite();

const data = `
    <div>
        <span />
        { ["text"] }
        <div {...spread} data-foo={ null } />
    </div>
`;

function addConfig(config: ESTreeBuilderConfig): void {
    suite.add(
        `complate-ast (${config.mode}/${config.target})`,
        () => {
            const esTreeBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(defaultRuntimeConfig), config);
            generate(preprocess(parse(data), esTreeBuilder, defaultRuntimeConfig));
        }
    )
}

allConfigs.forEach(addConfig);

suite
    .add(
        "sucrase",
        () => {
            sucrase.transform(data, {
                transforms: ["jsx"]
            })
        }
    )
    .add(
        "babel",
        () => {
            babel.transform(data, {
                plugins: ["@babel/plugin-transform-react-jsx"],
                filename: "bench.jsx"
            })
        }
    )
    .on("cycle", (event: Event) => {
        console.log(event.target.toString())
    })
    .run();