import {Event, Suite} from "benchmark";
import {preprocess} from "../preprocess/preprocess";
import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../preprocess/estreebuilders/config";
import {defaultRuntimeConfig, runtimeModuleFromConfig} from "../preprocess/runtime";
import {generate} from "astring";
import * as sucrase from "sucrase";
import * as babel from "@babel/core";
import {allConfigs} from "../test/_util";
import {Parser} from "acorn";
import jsx from "acorn-jsx";

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
            const acorn = Parser.extend(jsx());
            const parsed = acorn.parse(
                data,
                {
                    sourceType: "module",
                    ecmaVersion: 2019
                }
            );
            generate(preprocess(parsed, esTreeBuilder, defaultRuntimeConfig));
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