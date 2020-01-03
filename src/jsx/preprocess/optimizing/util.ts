import * as ESTree from "estree";
import {processStaticAttribute, Runtime, tagExpression} from "../util";
import {Attributes, escapeHTML, isVoidElement, normalizeAttribute, normalizeAttributes, isDynamic} from "../../syntax";
import * as Operations from "../../../estree/operations";
import * as Reify from "../../../estree/reify";
import {mapObject} from "../../../util";
import {ArrayExpr} from "../../../estree/expr";
import * as Structured from "../../../ast/structured";
import * as Raw from "../../../ast/raw";
import {extractAST} from "../../preprocess";
import _ from "lodash";

export class Tag {
    readonly expr: ESTree.Expression;
    readonly isVoid: boolean;
    readonly isDynamic: boolean;
    readonly open: ESTree.Expression;
    readonly close: ESTree.Expression;

    constructor(
        private readonly tag: string
    ) {
        this.isDynamic = isDynamic(tag);
        this.expr = tagExpression(tag);
        this.isVoid = isVoidElement(tag);

        if (this.isDynamic)
            this.open = Operations.binaryPlus(Reify.string("<"), this.expr);
        else
            this.open = Reify.string("<" + tag);

        if (this.isDynamic)
            this.close = Operations.binaryPlus(Reify.string("</"), this.expr, Reify.string(">"));
        else
            this.close = Reify.string(`</${tag}>`);
    }
}

export class ProcessedAttributes {
    private constructor(
        readonly statics: Attributes<string> = {},
        readonly dynamics: Attributes<ESTree.Expression> = {}
    ) {}

    get isStatic(): boolean {
        return Object.keys(this.dynamics).length === 0;
    }

    get reified(): ESTree.Expression {
        return Reify.object(Object.assign({}, this.dynamics, mapObject(this.statics, Reify.string)));
    }

    get staticString(): string {
        let result = "";
        for (const [key, value] of Object.entries(this.statics))
            result += ` ${key}="${escapeHTML(value)}"`;
        return result;
    }

    static fromAttributeValues(attributes: Attributes): ProcessedAttributes {
        return new ProcessedAttributes(normalizeAttributes(false, attributes));
    }

    static fromExpressions(attrs: Attributes<ESTree.Expression>): ProcessedAttributes {
        // for each attribute, there are two possible buckets:
        // 1a) truthy literal --> static: string (already normalized, needs to be escaped later)
        // 1b) falsy literal --> nothing
        // 2) non-literal --> dynamic: expr (needs to be normalized, checked for null-ness and rendered later)

        const processed = new ProcessedAttributes();
        for (const [key, expr] of Object.entries(attrs))
            if (expr.type === "Literal") {
                const staticAttribute = processStaticAttribute(expr as ESTree.Literal);
                const normalized = normalizeAttribute(key, staticAttribute);
                if (normalized != null)
                    processed.statics[key] = normalized;
            }
            else {
                processed.dynamics[key] = expr;
            }

        return processed;
    }

}

export interface BaseProcessedChildren {
    isStatic: boolean;
    isEmpty: boolean;
    normalized(runtime: Runtime): ArrayExpr;
}

export class StaticProcessedChildren implements BaseProcessedChildren {
    readonly isStatic: true = true;
    readonly isEmpty: boolean;
    private constructor(
        readonly children: Structured.AST[],
        private readonly raw: ESTree.Expression[],
    ) {
        this.isEmpty = this.children.length === 0;
    }

    get staticString(): string {
        return this.children.map(child => Structured.render(child, Raw.astBuilder).value).join("");
    }

    normalized(): ArrayExpr {
        return Reify.array(this.raw);
    }

    static fromASTs(children: Structured.AST[]): StaticProcessedChildren {
        return new StaticProcessedChildren(children, children.map(Reify.any));
    }

    static fromExpressions(raw: ESTree.Expression[]): StaticProcessedChildren {
        return new StaticProcessedChildren(raw.map(child => extractAST(child as ESTree.BaseNode)!), raw);
    }
}

export class DynamicProcessedChildren implements BaseProcessedChildren {
    readonly isStatic: false = false;
    readonly isEmpty: boolean;
    constructor(
        readonly raw: ESTree.Expression[]
    ) {
        this.isEmpty = this.raw.length === 0;
    }

    normalized(runtime: Runtime): ArrayExpr {
        return runtime.normalizeChildren(this.raw);
    }
}

export type ProcessedChildren = StaticProcessedChildren | DynamicProcessedChildren

export function processChildren(children: ESTree.Expression[]): ProcessedChildren {
    if (_.every(children, '_staticAST'))
        return StaticProcessedChildren.fromExpressions(children);
    else
        return new DynamicProcessedChildren(children);
}
