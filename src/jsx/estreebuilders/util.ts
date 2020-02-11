import * as ESTree from "estree";
import {Attributes, isDynamic, normalizeAttribute, normalizeAttributes, renderAttributes} from "../syntax";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {every, mapObject} from "../../util";
import {JSXAttribute} from "../../estree/jsx";

export function tagExpression(tag: string): ESTree.Expression {
    if (isDynamic(tag))
        return Operations.identifier(tag.substring(1));
    else
        return Reify.string(tag);
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
    const maybeSimple = every(attributes, attr => {
        switch (attr.type) {
            case "JSXAttribute":
                return attr;
            case "JSXSpreadAttribute":
                return false;
        }
    });

    if (maybeSimple !== false) {
        return NoSpreadProcessedAttributes.fromExpressions(Object.fromEntries(maybeSimple.map(attribute => {
            const value = attribute.value as ESTree.Expression || Reify.boolean(true);
            return [attribute.name.name, value]
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
