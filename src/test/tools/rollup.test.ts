/* eslint import/namespace: 0 */

import {complate} from "../../tools/rollup";
import {requireMock} from "../_util";
import jsx from "acorn-jsx";
import {InputOptions, OutputOptions, rollup} from "rollup";
import * as tempy from "tempy";
import {promises as fs} from "fs";
import {runInNewContext} from "vm";

describe("Rollup", () => {

    it("Rollup plugin", async () => {
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

        const output = await fs.readFile(outputFile);

        const result = runInNewContext(output.toString(), mock.sandbox);

        expect(result).toEqual({
            astType: "raw",
            value: "<div><span></span>text</div>"
        });

        mock.assertMock();

        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
    });

});