import * as ESTree from "estree-jsx";
import * as Operations from "../syntax/operations";
import {ArrayExpr} from "../syntax/expr";
import * as Reify from "reify-to-estree";

export class RuntimeModule {
    constructor(
        private readonly prefix: string,
    ) {}

    _member(name: string): ESTree.Expression {
        return Operations.identifier(this.prefix + name);
    }

    _call(name: string, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.Expression {
        return Operations.call(this._member(name), ...args);
    }

    normalizeChildren(kind: string, children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this._call(
            "normalizeChildren",
            this._member(`${kind}Text`),
            ...children
        ));
    }

    flatCompact(children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this._call(
            "flatCompact",
            ...children
        ));
    }

    escapeHTML(argument: ESTree.Expression): ESTree.Expression {
        return this._call("escapeHTML", argument);
    }

    isVoidElement(argument: ESTree.Expression): ESTree.Expression {
        return this._call("isVoidElement", argument);
    }

    normalizeAttribute(value: ESTree.Expression): ESTree.Expression {
        return this._call("normalizeAttribute", value);
    }

    normalizeAttributes(attributes: ESTree.Expression): ESTree.Expression {
        return this._call("normalizeAttributes", attributes);
    }

    renderAttributes(attributes: ESTree.Expression): ESTree.Expression {
        return this._call("renderAttributes", attributes);
    }

    builder(kind: string): ESTree.Expression {
        return Operations.member(
            Operations.call(this._member(`${kind}Info`)),
            Operations.identifier("builder")
        );
    }

    get fragmentMacro(): ESTree.Expression {
        return this._member("Fragment");
    }

    get unsafeRawMacro(): ESTree.Expression {
        return this._member("__UnsafeRaw");
    }
}

export interface RuntimeConfig {
    readonly prefix?: string;
    readonly importPath?: string;
}

export const defaultRuntimeConfig = {
    prefix: "__JSXRuntime__"
};

function prefixOrDefault(config: RuntimeConfig): string {
    return config.prefix !== undefined ? config.prefix : defaultRuntimeConfig.prefix;
}

export function runtimeModuleFromConfig(config: RuntimeConfig = defaultRuntimeConfig): RuntimeModule {
    return new RuntimeModule(prefixOrDefault(config));
}

export const runtimeSymbols: string[] = [
    "normalizeChildren",
    "flatCompact",
    "escapeHTML",
    "isVoidElement",
    "normalizeAttribute",
    "normalizeAttributes",
    "renderAttributes",
    "safe",
    "__UnsafeRaw",
    "Fragment",
    ...["structured", "stream", "raw"].flatMap(kind => [
        `${kind}Info`,
        `${kind}Text`
    ])
];

export function importStatement(config: RuntimeConfig): ESTree.Statement {
    const prefix = prefixOrDefault(config);
    const source = Reify.string(config.importPath!);

    // FIXME import declaration not yet supported in ESTree?!
    return {
        type: "ImportDeclaration",
        specifiers: runtimeSymbols.map(symbol => ({
            type: "ImportSpecifier",
            imported: Operations.identifier(symbol),
            local: Operations.identifier(prefix + symbol)
        })),
        source: source
    } as any;
}