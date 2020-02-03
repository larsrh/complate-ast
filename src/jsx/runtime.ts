import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import {ArrayExpr} from "../estree/expr";
import * as Reify from "../estree/reify";

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

    normalizeChildren(textBuilder: ESTree.Expression, children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this._call(
            "normalizeChildren",
            textBuilder,
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
        return Operations.member(this._member(`${kind}Info`), Operations.identifier("builder"));
    }

    textBuilder(kind: string): ESTree.Expression {
        return this._member(`${kind}Text`);
    }

    get fragmentMacro(): ESTree.Expression {
        return this._member("Fragment");
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

const runtimeSymbols: string[] = [
    "normalizeChildren",
    "escapeHTML",
    "isVoidElement",
    "normalizeAttribute",
    "normalizeAttributes",
    "renderAttributes",
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