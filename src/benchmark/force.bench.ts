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

    return output[0].code;
}

async function addConfig(config: ESTreeBuilderConfig): Promise<void> {
    console.log(`Compiling ${JSON.stringify(config)}`);
    const source = await run(
        "",
        complate(
            {
                importPath: path.resolve(root, "dist", "runtime")
            },
            config
        ),
        resolve({ extensions: [".js"] }),
        commonjs({
            include: `${root}/node_modules/**`
        })
    );
    const info = astInfos(config.target);
    suite.add(
        `complate-ast (${config.mode}/${config.target})`,
        {
            defer: true,
            fn(deferred: any) {
                new Promise<any>(resolve =>
                    runInNewContext(source, { resolve })
                ).then(result => {
                    const string = info.asString(info.force(result));
                    deferred.resolve(string);
                })
            }
        }
    );
}

async function addComplateStream(): Promise<void> {
    console.log("Compiling complate-stream");
    const source = await run(
        `import {generateHTML} from "${root}/node_modules/complate-stream/src/index"`,
        sucrase({
            exclude: [`${root}/node_modules/**`],
            transforms: ["jsx"],
            jsxPragma: "generateHTML"
        }),
        resolve({ extensions: [".js"] }),
        commonjs({
            include: `${root}/node_modules/**`
        })
    );
    suite.add(
        "complate-stream",
        {
            defer: true,
            fn(deferred: any) {
                const stream = new BufferedStream();
                new Promise<any>(resolve =>
                    runInNewContext(source, { resolve })
                ).then(result => {
                    result(stream, {nonBlocking: true}, () => {
                        const result = stream.read();
                        deferred.resolve(result);
                    });
                });
            }
        }
    );
}

async function prepareSuite(): Promise<void> {
    for (const config of allConfigs)
        await addConfig(config);
    await addComplateStream();
    suite.on("cycle", (event: Event) => {
        console.log(event.target.toString())
    });
}

prepareSuite().then(() => {
    suite.run({ async: true });
});
