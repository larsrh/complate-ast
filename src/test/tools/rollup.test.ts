/* eslint import/namespace: 0 */

import {complate} from "../../tools/rollup";
import {matrix, projectRoot} from "../_util";
import jsx from "acorn-jsx";
import {InputOptions, OutputOptions, rollup} from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import * as tempy from "tempy";
import {promises as fs} from "fs";
import {runInNewContext} from "vm";
import sucrase from "@rollup/plugin-sucrase";
import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import {astInfos} from "../../ast";

describe("Rollup", () => {

    jest.setTimeout(10000);

    const root = projectRoot();

    matrix(config => {

        const info = astInfos(config.target);
        const builder = info.builder;

        it("Rollup plugin", async () => {

            const inputFile = tempy.file({ extension: "jsx" });
            await fs.writeFile(inputFile, `
                import {safe} from "${root}/src/lib";

                resolve(<div><span />{ ["text", safe("<" + "br>")] }</div>);
            `);

            const inputOptions: InputOptions = {
                plugins: [
                    complate(
                        {
                            importPath: path.resolve(root, "src", "runtime")
                        },
                        config
                    ),
                    resolve({ extensions: [".js", ".ts"] }),
                    sucrase({
                        exclude: [`${root}/node_modules/**`],
                        transforms: ["typescript"]
                    }),
                    commonjs({
                        include: `${root}/node_modules/**`
                    })
                ],
                input: inputFile,
                acornInjectPlugins: [jsx()]
            };

            const rollupBuild = await rollup(inputOptions);

            const outputOptions: OutputOptions = {
                format: "cjs",
                sourcemap: false
            };

            const { output } = await rollupBuild.generate(outputOptions);

            expect(output).toHaveLength(1);

            const result = await new Promise<any>(resolve =>
                runInNewContext(output[0].code, { resolve })
            );

            const expected = info.force(
                builder.element("div", {}, builder.element("span"), builder.text("text"), builder.prerendered("<br>"))
            );

            expect(info.force(result)).toEqual(expected);

            await fs.unlink(inputFile);
        });

    });

});