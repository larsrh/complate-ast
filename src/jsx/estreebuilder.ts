import {BaseBuilder} from "../ast/builder";
import * as ESTree from "estree";
import {NoSpreadProcessedAttributes, ProcessedAttributes} from "./estreebuilders/util";
import {Attributes, AttributeValue, normalizeAttribute} from "./syntax";
import * as Reify from "../estree/reify";

export abstract class ESTreeBuilder implements BaseBuilder<ESTree.Expression, ESTree.Expression, ESTree.Expression> {

    constructor(
        readonly canStatic: boolean
    ) {}

    abstract jsxElement(tag: string, attributes: ProcessedAttributes, children: ESTree.Expression[]): ESTree.Expression;

    abstract text(text: string): ESTree.Expression;

    prerendered(p: ESTree.Expression): ESTree.Expression {
        return p;
    }

    attributeValue(value: AttributeValue): ESTree.Expression {
        return Reify.any(normalizeAttribute(value));
    }

    element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.jsxElement(
            tag,
            NoSpreadProcessedAttributes.fromExpressions(attributes || {}),
            children
        );
    }

}
