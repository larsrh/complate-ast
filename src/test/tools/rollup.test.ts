/* eslint import/namespace: 0 */

import {complate} from "../../tools/rollup";
import {projectRoot} from "../_util";
import jsx from "acorn-jsx";
import {InputOptions, OutputOptions, rollup} from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import * as tempy from "tempy";
import {promises as fs} from "fs";
import {runInNewContext} from "vm";
import typescript from "@rollup/plugin-typescript";
import path from "path";
import commonjs from "@rollup/plugin-commonjs";

describe("Rollup", () => {

    jest.setTimeout(30000);

    it("Rollup plugin", async () => {
        const root = projectRoot();

        const inputFile = tempy.file({ extension: "jsx" });
        await fs.writeFile(inputFile, `<div><span />{ ["text"] }</div>`);

        const inputOptions: InputOptions = {
            plugins: [
                complate({
                    importPath: path.resolve(root, "src", "runtime")
                }),
                typescript({
                    tsconfig: path.resolve(root, "tsconfig.rollup.json")
                }),
                resolve({ extensions: [".js", ".ts"] }),
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

        const result = runInNewContext(output[0].code, {});

        expect(result).toEqual({
            astKind: "raw",
            value: "<div><span></span>text</div>"
        });

        await fs.unlink(inputFile);
    });

});