import {ESTreeBuilderConfig} from "../jsx/estreebuilders/config";
import {RuntimeConfig} from "../jsx/runtime";
import path from "path";

export const allConfigs: ESTreeBuilderConfig[] = [
    { mode: "simple", target: "structured" },
    { mode: "simple", target: "stream" },
    { mode: "simple", target: "raw" },
    { mode: "optimizing", target: "structured" },
    { mode: "optimizing", target: "stream" },
    { mode: "optimizing", target: "raw" }
];

export const runtimeConfig: RuntimeConfig = {
    prefix: ""
};

export function matrix(action: (config: ESTreeBuilderConfig) => void): void {
    describe.each(allConfigs)(`%o`, config =>
        action(config)
    );
}

export function projectRoot(): string {
    return path.resolve(__dirname, "..", "..");
}