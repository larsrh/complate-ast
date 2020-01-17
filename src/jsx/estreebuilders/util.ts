import * as ESTree from "estree";
import {Attributes, isDynamic, normalizeAttribute, normalizeAttributes, renderAttributes} from "../syntax";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {mapObject} from "../../util";
import {JSXAttribute, JSXSimpleAttribute} from "../../estree/jsx";
import {every} from "lodash-es";
import * as Structured from "../../ast/structured";

export function tagExpression(tag: string): ESTree.Expression {
    if (isDynamic(tag))
        return Operations.identifier(tag.substring(1));
    else
        return Reify.string(tag);
}

// TODO use hygiene?
export class Gensym {
    private counter: bigint;

    constructor(
        readonly prefix: string
    ) {
        this.counter = BigInt(0);
    }

    sym(): ESTree.Identifier {
        this.counter += BigInt(1);
        return Operations.identifier(this.prefix + this.counter);
    }
}

function processStaticAttribute(literal: ESTree.Literal): string | boolean | null {
    const value = literal.value;
    if (value === null)
        return null;
    else if (typeof value === "boolean")
        return value;
    else if (typeof value === "string")
        return value;
    else if (typeof value === "number")
        return value.toString();
    else
        // RegExp, undefined or others
        throw new Error(`Unknown literal type ${literal}`);
}

function processAttribute(value: ESTree.Expression): string | true | null | ESTree.Expression {
    if (value.type === "Literal") {
        const staticAttribute = processStaticAttribute(value);
        return normalizeAttribute(staticAttribute);
    }
    else {
        return value;
    }
}

export interface BaseProcessedAttributes {
    readonly containsSpread: boolean;
    readonly merged: ESTree.Expression;
}

export class NoSpreadProcessedAttributes implements BaseProcessedAttributes {
    readonly containsSpread: false = false;

    private constructor(
        readonly statics: Attributes<true | string> = {},
        readonly dynamics: Attributes<ESTree.Expression> = {}
    ) {}

    private clear(key: string): void {
        delete this.statics[key];
        delete this.dynamics[key];
    }

    get merged(): ESTree.Expression {
        return Reify.object(Object.assign({}, this.dynamics, mapObject(this.statics, Reify.any)));
    }

    get isStatic(): boolean {
        return Object.keys(this.dynamics).length === 0;
    }

    get staticString(): string {
        return renderAttributes(this.statics);
    }

    static fromAttributeValues(attributes: Attributes): ProcessedAttributes {
        return new NoSpreadProcessedAttributes(normalizeAttributes(attributes));
    }

    static fromExpressions(attrs: Attributes<ESTree.Expression>): ProcessedAttributes {
        // for each attribute, there are two possible buckets:
        // 1a) truthy literal --> static: string (already normalized, needs to be escaped later)
        // 1b) falsy literal --> nothing
        // 2) non-literal --> dynamic: expr (needs to be normalized, checked for null-ness and rendered later)

        const processed = new NoSpreadProcessedAttributes();
        for (const [key, expr] of Object.entries(attrs)) {
            processed.clear(key);
            const attr = processAttribute(expr);
            if (typeof attr === "string" || attr === true)
                processed.statics[key] = attr;
            else if (attr !== null)
                processed.dynamics[key] = attr;
        }

        return processed;
    }
}

export class SpreadProcessedAttributes implements BaseProcessedAttributes {
    readonly containsSpread: true = true;

    constructor(
        readonly merged: ESTree.Expression
    ) {}
}

export type ProcessedAttributes = NoSpreadProcessedAttributes | SpreadProcessedAttributes;

export function processAttributes(attributes: JSXAttribute[]): ProcessedAttributes {
    if (every(attributes, { type: "JSXAttribute" })) {
        return NoSpreadProcessedAttributes.fromExpressions(Object.fromEntries(attributes.map(attribute => {
            const attr = attribute as JSXSimpleAttribute;
            const value = attr.value as ESTree.Expression || Reify.boolean(true);
            return [attr.name.name, value]
        })));
    }
    else {
        const processed: (ESTree.Property | ESTree.SpreadElement)[] = [];
        for (const attribute of attributes)
            switch (attribute.type) {
                case "JSXAttribute": {
                    const key = Operations.identifier(attribute.name.name);
                    const attr = processAttribute(attribute.value as ESTree.Expression || Reify.boolean(true));
                    let value: ESTree.Expression;
                    // a later x={null} or x={false} attribute may override a previous attribute from a spread,
                    // so those need to be preserved here
                    if (typeof attr === "string" || attr === null || attr === true)
                        value = Reify.any(attr);
                    else
                        value = attr;
                    processed.push({
                        type: "Property",
                        method: false,
                        shorthand: false,
                        computed: false,
                        key: key,
                        value: value,
                        kind: "init"
                    });
                    break;
                }
                case "JSXSpreadAttribute": {
                    processed.push({
                        type: "SpreadElement",
                        argument: attribute.argument as ESTree.Expression
                    });
                    break;
                }
            }
        return new SpreadProcessedAttributes(Operations.object(...processed));
    }
}

export interface RichNode extends ESTree.BaseNode {
    _staticAST: Structured.AST;
}

export function hasAST(node: ESTree.BaseNode): node is RichNode {
    return (node as any)._staticAST;
}

export function extractAST(node: ESTree.BaseNode): Structured.AST | null {
    if (hasAST(node))
        return node._staticAST;
    else
        return null;
}

export function injectAST(node: ESTree.Node, ast: Structured.AST): void {
    (node as RichNode)._staticAST = ast;
}