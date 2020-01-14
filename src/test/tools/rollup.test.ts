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

    it("Rollup plugin (simple)", async () => {
        const mock = requireMock();

        const inputFile = tempy.file({ extension: "jsx" });
        await fs.writeFile(inputFile, `<div><span />{ ["text"] }</div>`);

        const inputOptions: InputOptions = {
            input: inputFile,
            plugins: [
                complate(mock.runtime)
            ],
            acornInjectPlugins: [jsx()]
        };

        const outputFile = tempy.file({ extension: "js" });

        const outputOptions: OutputOptions = {
            file: outputFile,
            format: "cjs",
            sourcemap: false
        };

        const rollupBuild = await rollup(inputOptions);

        await rollupBuild.write(outputOptions);

        const output = await fs.readFile(outputFile, "utf8");

        const result = runInNewContext(output, mock.sandbox);

        expect(result).toEqual({
            astType: "raw",
            value: "<div><span></span>text</div>"
        });

        mock.assertMock();

        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
    });

    it("Rollup plugin (with resolve)", async () => {
        const root = projectRoot();
        const inputFile = tempy.file({ extension: "jsx" });
        await fs.writeFile(inputFile, `<div><span />{ ["text"] }</div>`);

        const inputOptions: InputOptions = {
            input: inputFile,
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
            acornInjectPlugins: [jsx()]
        };

        const outputFile = tempy.file({ extension: "js" });

        const outputOptions: OutputOptions = {
            file: outputFile,
            format: "cjs",
            sourcemap: false
        };

        const rollupBuild = await rollup(inputOptions);

        await rollupBuild.write(outputOptions);

        const output = await fs.readFile(outputFile, "utf8");

        const result = runInNewContext(output, {});

        expect(result).toEqual({
            astType: "raw",
            value: "<div><span></span>text</div>"
        });

        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
    });

});