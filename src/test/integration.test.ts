import {matrix, projectRoot} from "./_util";
import {renderToString} from "../ast";
import {runInNewContext} from "vm";
import {join} from "path";
import {Parser} from "acorn";
import jsx from "acorn-jsx";
import {promises as fs} from "fs";
import {esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {RuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";
import {generate} from "astring";
import {preprocess} from "../jsx/preprocess";
import * as Runtime from "../runtime";

const parser = Parser.extend(jsx());
const runtimeConfig: RuntimeConfig = {
    prefix: ""
};

const expected =
    "<!DOCTYPE HTML><html><body><h1>Hello World</h1><article><h2>Lipsum</h2><ol><li>foo</li><li>bar</li></ol><p>lorem ipsum dolor sit amet</p></article></body></html>";

describe("Full example", () => {

    const root = projectRoot();
    const file = join(root, "src", "test", "data", "snippet.jsx");

    matrix(config => {

        it("Correct rendering", async () => {

            const contents = await fs.readFile(file, { encoding: "utf-8" });
            const parsedAST = parser.parse(contents);
            const esTreeBuilder = esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), config);
            const generated = generate(preprocess(parsedAST, esTreeBuilder, runtimeConfig));

            const result = runInNewContext(generated, Runtime);
            const html = renderToString(config.target, result);

            expect(html).toEqual(expected);

        });

    });

});