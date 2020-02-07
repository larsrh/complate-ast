import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import sucrase from "@rollup/plugin-sucrase";

export default {
    input: "src/tools/rollup.ts",
    output: {
        file: "dist/bundles/rollup.js",
        format: "cjs"
    },
    plugins: [
        resolve({ extensions: [".js", ".ts"] }),
        sucrase({
            exclude: [`${root}/node_modules/**`],
            transforms: ["typescript"]
        }),
        commonjs({
            include: `${root}/node_modules/**`
        })
    ]
};