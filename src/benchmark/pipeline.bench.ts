import {Event, Suite} from "benchmark";
import {ESTreeBuilderConfig} from "../jsx/estreebuilders/config";
import {allConfigs, projectRoot} from "../test/_util";
import {InputOptions, Plugin, OutputOptions, rollup} from "rollup";
import * as tempy from "tempy";
import {promises as fs} from "fs";
import jsx from "acorn-jsx";
import complate from "../tools/rollup";
import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import sucrase from "@rollup/plugin-sucrase";
import {runInNewContext} from "vm";
import {astInfos} from "../ast";
import BufferedStream from "complate-stream/src/buffered-stream";

const suite = new Suite();

const data = `
    function render() {
        return (<div>
            <span />
            { ["text"] }
            <div data-bar="test" data-foo={ null } />
        </div>);
    }

    resolve(render());
`;

const root = projectRoot();

async function run(header: string, ...plugins: Plugin[]): Promise<any> {
    // eslint-disable-next-line import/namespace
    const inputFile = tempy.file({ extension: "jsx" });

    await fs.writeFile(inputFile, header + data);

    const inputOptions: InputOptions = {
        plugins,
        input: inputFile,
        acornInjectPlugins: [jsx()]
    };

    const rollupBuild = await rollup(inputOptions);

    const outputOptions: OutputOptions = {
        format: "cjs",
        sourcemap: false
    };

    const { output } = await rollupBuild.generate(outputOptions);

    await fs.unlink(inputFile);

    return new Promise<any>(resolve =>
        runInNewContext(output[0].code, { resolve })
    );
}

function addConfig(config: ESTreeBuilderConfig): void {
    suite.add(
        `complate-ast (${config.mode}/${config.target})`,
        {
            defer: true,
            fn(deferred: any) {
                run(
                    "",
                    complate(
                        {
                            importPath: path.resolve(root, "src", "runtime")
                        },
                        config
                    ),
                    resolve({ extensions: [".js", ".ts"] }),
                    commonjs(),
                    sucrase({
                        exclude: [`${root}/node_modules/**`],
                        transforms: ["typescript"]
                    })
                ).then(result => {
                    const info = astInfos(config.target);
                    const string = info.asString(info.force(result));
                    deferred.resolve(string);
                })
            }
        }
    )
}

allConfigs.forEach(addConfig);

suite
    .add(
        "complate-stream",
        {
            defer: true,
            fn(deferred: any) {
                run(
                    `import {generateHTML} from "${root}/node_modules/complate-stream/src/index"`,
                    sucrase({
                        exclude: [`${root}/node_modules/**`],
                        transforms: ["jsx"],
                        jsxPragma: "generateHTML"
                    }),
                    resolve({ extensions: [".js"] }),
                    commonjs()
                ).then(result => {
                    const stream = new BufferedStream();
                    result(stream, { nonBlocking: true }, () => {
                        const result = stream.read();
                        deferred.resolve(result);
                    });
                });
            }
        }
    )
    .on("cycle", (event: Event) => {
        console.log(event.target.toString())
    })
    .run({ async: true });
