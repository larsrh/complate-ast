import * as ESTree from "estree";
import * as Operations from "../estree/operations";
import {ArrayExpr} from "../estree/expr";
import * as Reify from "../estree/reify";

export class RuntimeModule {
    constructor(
        private readonly prefix: ESTree.Identifier,
    ) {}

    _member(name: string): ESTree.Expression {
        return Operations.member(this.prefix, Operations.identifier(name));
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
        return this._member(`${kind}Builder`);
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
    readonly es6Import?: boolean;
}

export const defaultRuntimeConfig = {
    prefix: "JSXRuntime"
};

function prefix(config: RuntimeConfig): ESTree.Identifier {
    return Operations.identifier(config.prefix || defaultRuntimeConfig.prefix);
}

export function runtimeModuleFromConfig(config: RuntimeConfig = defaultRuntimeConfig): RuntimeModule {
    return new RuntimeModule(prefix(config));
}

export function importStatement(config: RuntimeConfig): ESTree.Statement {
    const source = Reify.string(config.importPath!);

    if (config.es6Import === true)
        return {
            type: "ImportDeclaration",
            specifiers: [{
                type: "ImportNamespaceSpecifier",
                local: prefix(config)
            }],
            source: source
        } as any;
    else
        return {
            type: "VariableDeclaration",
            kind: "const",
            declarations: [{
                type: "VariableDeclarator",
                id: prefix(config),
                init: Operations.call(Operations.identifier("require"), source)
            }]
        };
}