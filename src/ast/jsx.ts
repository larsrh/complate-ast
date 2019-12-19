import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../js/reify";
import * as Universal from "./universal";
import * as Structured from "./structured";
import * as Raw from "./raw";
import {JSXElement, JSXExpressionContainer, JSXText} from "../js/jsx";
import _ from "lodash";
import {Builder} from "./builder";
import {isMacro} from "../util";

// TODO use import
const jsx = require("acorn-jsx");

export const acorn = Parser.extend(jsx());

export function extractAST(node: ESTree.Node): Universal.AST | null {
    const richNode = node as any as { _static_ast?: Universal.AST };
    if (richNode._static_ast)
        return richNode._static_ast;
    else
        return null;
}

function injectAST(node: ESTree.Node, ast: Universal.AST) {
    (node as any)._static_ast = ast;
}

function runtimeExpression(_runtime?: string): ESTree.Identifier {
    const runtime = _runtime === undefined ? "JSXRuntime" : _runtime;
    return {
        type: "Identifier",
        name: runtime
    };
}

class Runtime {
    constructor(
        private readonly runtime: ESTree.Expression
    ) {}

    private select(name: string): ESTree.Expression {
        const identifier: ESTree.Identifier = {
            type: "Identifier",
            name: name
        };
        return {
            type: "MemberExpression",
            object: this.runtime,
            property: identifier,
            computed: false
        };

    }

    builder(mode: Universal.Kind): ESTree.Expression {
        return this.select(`${mode}Builder`);
    }

    get normalizeChildren(): ESTree.Expression {
        return this.select("normalizeChildren");
    }

    get escapeHTML(): ESTree.Expression {
        return this.select("escapeHTML");
    }
}

// not exactly a `Builder`: attributes are already expressions, not strings
export interface ESTreeBuilder {
    element(tag: string, attributes: Map<string, ESTree.Expression>, children: ESTree.Expression[]): ESTree.Expression
    macro(macro: string, attributes: Map<string, ESTree.Expression>, children: ESTree.Expression[]): ESTree.Expression
    text(text: string): ESTree.Expression
    readonly canStatic: boolean
}

export class RuntimeBuilder implements ESTreeBuilder {
    private readonly runtime: Runtime;
    readonly canStatic = false;

    constructor(
        private readonly mode: Universal.Kind,
        runtime?: string
    ) {
        this.runtime = new Runtime(runtimeExpression(runtime));
    }

    private elementish(
        callee: ESTree.Expression,
        tag: string | null,
        attributes: Map<string, ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        const tagish = tag !== null ? [Reify.string(tag)] : [];
        return {
            type: "CallExpression",
            callee: callee,
            arguments: [
                ...tagish,
                Reify.object(attributes),
                {
                    type: "SpreadElement",
                    argument: {
                        type: "CallExpression",
                        callee: this.runtime.normalizeChildren,
                        arguments: [
                            Reify.string(this.mode),
                            ...children
                        ]
                    }
                }
            ]
        };
    }

    element(
        tag: string,
        attributes: Map<string, ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.elementish(
            {
                type: "MemberExpression",
                object: this.runtime.builder(this.mode),
                property: {
                    type: "Identifier",
                    name: "element"
                },
                computed: false
            },
            tag,
            attributes,
            children
        );
    }

    macro(
        macro: string,
        attributes: Map<string, ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.elementish(
            { type: "Identifier", name: macro },
            null,
            attributes,
            children
        );
    }

    text(text: string): ESTree.Expression {
        return {
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: this.runtime.builder(this.mode),
                property: {
                    type: "Identifier",
                    name: "text"
                },
                computed: false
            },
            arguments: [Reify.string(text)]
        };
    }
}

export class OptimizingBuilder implements ESTreeBuilder {
    private readonly runtime: Runtime;
    private readonly builder?: Builder<Universal.AST>;
    readonly canStatic = true;

    constructor(
        private readonly mode: Universal.Kind,
        runtime?: string
    ) {
        this.runtime = new Runtime(runtimeExpression(runtime));
        if (this.mode === "structured")
            this.builder = Structured.astBuilder;
        else if (this.mode === "raw")
            this.builder = Raw.astBuilder;
        // "stream" intentionally left blank
    }

    private staticChildren(children: ESTree.Expression[]): Universal.AST[] | null {
        if (_.every(children, '_static_ast')) {
            const staticChildren = children.map(child => extractAST(child as ESTree.Node)!);

            if (!_.every(staticChildren, { astType: this.mode }))
                throw new Error(`Bug: ${this.mode} node contains static, non-${this.mode} children`);

            return staticChildren;
        }

        return null;
    }

    private normalizeChildren(isStaticChildren: boolean, children: ESTree.Expression[]): ESTree.Expression {
        if (isStaticChildren)
            // children are statically known --> we don't have to normalize them
            // (this is a sufficient condition, but not the necessary condition! a child that directly stems from
            // a macro also doesn't have to be normalized; future performance optimization)
            return Reify.array(children);
        else
            // fallback: insert a call to `normalizeChildren`
            return {
                type: "CallExpression",
                callee: this.runtime.normalizeChildren,
                arguments: [Reify.string(this.mode), ...children]
            };
    }

    element(
        tag: string,
        attributes: Map<string, ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        // normally, we would emit a `ESTree.Node` that, when executed, evaluates to the desired JSX AST
        // this is the general case because e.g. macros can perform arbitrary computations at runtime
        // however, if `isStatic` is true, we can also compute the full JSX AST at compile-time
        // this works on a best effort basis: if a particular subtree is static, we compute it here and attach
        // it as a non-standard field in the returned `ESTree.Node`
        // caveat: we may do superfluous work here, but that's okay, since all of this happens at compile time
        const staticChildren = this.staticChildren(children);
        const isStaticChildren = staticChildren !== null;
        const isStaticAttributes = _.every([...attributes.values()], { type: "Literal" });
        const isStatic =
            // streaming AST can't be reified because it contains a function
            this.mode !== "stream" &&
            // all children need to be static
            isStaticChildren &&
            // all attributes must be literal
            isStaticAttributes;

        let staticAttributes: object | null;
        if (isStaticAttributes)
            staticAttributes = Object.fromEntries([...attributes.entries()].map(entry => {
                const [key, value] = entry;
                return [key, (value as ESTree.Literal).value];
            }));

        if (isStatic) {
            const ast = this.builder!.element(
                tag,
                staticAttributes!,
                ...staticChildren!
            );
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }

        // at this point, `isStatic` is false

        const normalizedChildren = this.normalizeChildren(isStaticChildren, children);

        if (this.mode === "structured") {
            return Reify.object(new Map<string, ESTree.Expression>([
                ["astType", Reify.string("structured")],
                ["nodeType", Reify.string("element")],
                ["tag", Reify.string(tag)],
                ["attributes", Reify.object(attributes)],
                ["children", normalizedChildren]
            ]));
        }
        else if (this.mode === "stream") {
            throw new Error("unsupported");
        }
        else { // raw
            const selector: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [{type: "Identifier", name: "x"}],
                body: {
                    type: "MemberExpression",
                    object: {type: "Identifier", name: "x"},
                    property: {type: "Identifier", name: "value"},
                    computed: false
                }
            };
            const children: ESTree.SpreadElement = {
                type: "SpreadElement",
                argument: Reify.functions.arrayMap(normalizedChildren, selector)
            };
            const parts = [
                Reify.string("<" + tag),
                // TODO escaping attributes needs to take false/true/null/undefined into account
                ...[...attributes.entries()].map(attribute => {
                    const [key, value] = attribute;
                    return Reify.functions.binaryPlus(
                        Reify.string(` ${key}="`),
                        Reify.functions.binaryPlus(
                            {
                                type: "CallExpression",
                                callee: this.runtime.escapeHTML,
                                arguments: [value]
                            },
                            Reify.string('"')
                        )
                    );
                }),
                Reify.string(">"),
                children,
                Reify.string(`</${tag}>`)
            ];
            return Reify.object(new Map<string, ESTree.Expression>([
                ["astType", Reify.string("raw")],
                ["value", Reify.functions.arrayJoin(Reify.array(parts))]
            ]));
        }
    }

    macro(
        tag: string,
        attributes: Map<string, ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        const normalizedChildren = this.normalizeChildren(
            this.staticChildren(children) !== null,
            children
        );

        return {
            type: "CallExpression",
            callee: {
                type: "Identifier",
                name: tag
            },
            arguments: [
                Reify.object(attributes),
                {
                    type: "SpreadElement",
                    argument: normalizedChildren
                }
            ]
        };
    }

    text(text: string): ESTree.Expression {
        if (this.mode === "structured") {
            const ast = Structured.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
        else if (this.mode === "stream") {
            throw new Error("unsupported");
        }
        else { // raw
            const ast = Raw.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
    }

}

export function parse(js: string): ESTree.Node {
    return acorn.parse(js) as any as ESTree.Node; // TODO dodgy: version mismatch??
}

export function preprocess(ast: ESTree.Node, builder: ESTreeBuilder): ESTree.Program {
    const compiled = walk(ast, {
        enter(node, parent, prop, index) {
        },
        leave(node, parent, prop, index) {
            // @ts-ignore
            if (node.type === "JSXElement") {
                const element = node as any as JSXElement;
                const tag = element.openingElement.name.name;
                const attributes = new Map<string, ESTree.Expression>(
                    element.openingElement.attributes.map(attr =>
                        [attr.name.name, attr.value as ESTree.Expression]
                    )
                );
                const children = element.children as ESTree.Expression[];
                const replacement =
                    isMacro(tag) ?
                        builder.macro(tag, attributes, children) :
                        builder.element(tag, attributes, children);
                this.replace(replacement);
            }
            // @ts-ignore
            else if (node.type === "JSXExpressionContainer") {
                const container = node as any as JSXExpressionContainer;
                this.replace(container.expression);
            }
            // @ts-ignore
            else if (node.type === "JSXText") {
                const text = node as any as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    });
    return compiled as ESTree.Program;
}