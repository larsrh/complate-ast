import {ESTreeBuilderConfig, esTreeBuilderFromConfig} from "../jsx/estreebuilders/config";
import {AST, astInfos} from "../ast";
import {Builder} from "../ast/builder";
import {ESTreeBuilder} from "../jsx/estreebuilder";
import {RuntimeConfig, runtimeModuleFromConfig} from "../jsx/runtime";
import * as _JSXRuntime from "../runtime";
import path from "path";

const allConfigs: ESTreeBuilderConfig[] = [
    { mode: "simple", target: "structured" },
    { mode: "simple", target: "stream" },
    { mode: "simple", target: "raw" },
    { mode: "optimizing", target: "structured" },
    { mode: "optimizing", target: "stream" },
    { mode: "optimizing", target: "raw" }
];

export const runtimeConfig: RuntimeConfig = {};

export function matrix(
    action: (config: ESTreeBuilderConfig, astBuilder: Builder<AST>, esBuilder: ESTreeBuilder) => void
): void {
    describe.each(allConfigs)(`%o`, config =>
        action(config, astInfos[config.target].builder, esTreeBuilderFromConfig(runtimeModuleFromConfig(runtimeConfig), config))
    );
}

export interface RequireMock {
    readonly runtime: RuntimeConfig;
    readonly sandbox: object;
    assertMock(): void;
}

export function requireMock(): RequireMock {
    const importPath = "__MOCKED__";
    const config = {
        importPath: importPath,
        prefix: "__TEST_RUNTIME__"
    };
    const require = jest.fn(() => _JSXRuntime);
    return {
        runtime: config,
        sandbox: { require: require },
        assertMock: () => {
            expect(require).toHaveBeenCalledTimes(1);
            expect(require).toHaveBeenCalledWith(importPath);
        }
    };
}

export function projectRoot(): string {
    return path.resolve(__dirname, "..", "..");
}