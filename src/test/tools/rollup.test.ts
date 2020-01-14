/* eslint import/namespace: 0 */

import {complate} from "../../tools/rollup";
import {projectRoot, requireMock} from "../_util";
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

    jest.setTimeout(10000);

    async function test(sandbox: object, options: InputOptions): Promise<void> {
        const inputFile = tempy.file({ extension: "jsx" });
        await fs.writeFile(inputFile, `<div><span />{ ["text"] }</div>`);

        const inputOptions = {
            ...options,
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

        const result = runInNewContext(output[0].code, sandbox);

        expect(result).toEqual({
            astType: "raw",
            value: "<div><span></span>text</div>"
        });

        await fs.unlink(inputFile);
    }

    it("Rollup plugin (simple)", async () => {
        const mock = requireMock();

        await test(mock.sandbox, {
            plugins: [
                complate(mock.runtime)
            ]
        });

        mock.assertMock();
    });

    it("Rollup plugin (with resolve)", async () => {
        const root = projectRoot();

        await test({}, {
            plugins: [
                complate({
                    importPath: path.resolve(root, "src", "runtime"),
                    es6Import: true
                }),
                typescript({
                    tsconfig: path.resolve(root, "tsconfig.base.json")
                }),
                resolve({ extensions: [".js", ".ts"] }),
                commonjs({
                    include: `${root}/node_modules/**`
                })
            ],
        });
    });

});