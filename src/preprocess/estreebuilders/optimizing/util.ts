import * as ESTree from "estree-jsx";
import {tagExpression} from "../util";
import {isVoidElement, isDynamic, isMacro} from "../../../syntax/util";
import * as Operations from "../../../syntax/operations";
import * as Reify from "reify-to-estree";
import {ArrayExpr} from "../../../syntax/expr";
import * as Structured from "../../../ast/structured";
import * as Raw from "../../../ast/raw";
import {RuntimeModule} from "../../runtime";
import {AST} from "../../../ast/structured";

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

export class Tag {
    readonly expr: ESTree.Expression;
    readonly isVoid: boolean;
    readonly isDynamic: boolean;
    readonly open: ESTree.Expression;
    readonly close: ESTree.Expression;

    constructor(
        private readonly tag: string
    ) {
        if (isMacro(tag))
            throw new Error(`Macro tag ${tag} not allowed here`);

        this.isDynamic = isDynamic(tag);
        this.expr = tagExpression(tag);
        this.isVoid = isVoidElement(tag);

        if (this.isDynamic)
            this.open = Operations.plus(Reify.string("<"), this.expr);
        else
            this.open = Reify.string("<" + tag);

        if (this.isDynamic)
            this.close = Operations.plus(Reify.string("</"), this.expr, Reify.string(">"));
        else
            this.close = Reify.string(`</${tag}>`);
    }
}

export interface BaseProcessedChildren {
    isStatic: boolean;
    isEmpty: boolean;
    normalized(kind: string, runtime: RuntimeModule): ArrayExpr;
}

export interface RichNode extends ESTree.BaseNode {
    _staticAST: AST;
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
        return this.children.map(child => Structured.render(child, Raw.info().builder).value).join("");
    }

    normalized(): ArrayExpr {
        return new ArrayExpr(Reify.array(this.raw));
    }

    static fromASTs(children: Structured.AST[]): StaticProcessedChildren {
        return new StaticProcessedChildren(children, children.map(Reify.any));
    }

    static fromExpressions(raw: (ESTree.Expression & RichNode)[]): StaticProcessedChildren {
        return new StaticProcessedChildren(raw.map(child => child._staticAST), raw);
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

    normalized(kind: string, runtime: RuntimeModule): ArrayExpr {
        return runtime.normalizeChildren(kind, this.raw);
    }
}

export type ProcessedChildren = StaticProcessedChildren | DynamicProcessedChildren
