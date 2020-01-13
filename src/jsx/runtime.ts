import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import {ArrayExpr} from "../estree/expr";
import * as Reify from "../estree/reify";

export class RuntimeModule {
    constructor(
        readonly prefix: ESTree.Identifier,
        readonly importPath?: string
    ) {}

    _member(name: string): ESTree.Expression {
        return Operations.member(this.prefix, Operations.identifier(name));
    }

    _call(name: string, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.Expression {
        return Operations.call(this._member(name), ...args);
    }

    normalizeChildren(kind: string, children: ESTree.Expression[]): ArrayExpr {
        return new ArrayExpr(this._call(
            "normalizeChildren",
            Reify.string(kind),
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
        return this._member(`${kind}Builder`);
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
    prefix: "JSXRuntime"
};

export function runtimeModuleFromConfig(config: RuntimeConfig = defaultRuntimeConfig): RuntimeModule {
    return new RuntimeModule(Operations.identifier(config.prefix || defaultRuntimeConfig.prefix), config.importPath);
}
