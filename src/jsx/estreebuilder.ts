import {Builder} from "../ast/builder";
import * as ESTree from "estree";
import {NoSpreadProcessedAttributes, ProcessedAttributes} from "./estreebuilders/util";
import {Attributes, AttributeValue} from "./syntax";
import * as Reify from "../estree/reify";

export abstract class ESTreeBuilder implements Builder<ESTree.Expression, ESTree.Expression, ESTree.Expression> {

    constructor(
        readonly canStatic: boolean,
        readonly fragment: ESTree.Expression
    ) {}

    abstract elementOrMacro(
        tag: string | ESTree.Expression,
        attributes: ProcessedAttributes,
        children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract text(text: string): ESTree.Expression;

    prerendered(p: ESTree.Expression): ESTree.Expression {
        return p;
    }

    attributeValue(key: string, value: AttributeValue): ESTree.Expression {
        return Reify.any(value);
    }

    element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.elementOrMacro(
            tag,
            NoSpreadProcessedAttributes.fromExpressions(attributes || {}),
            children
        );
    }

}
