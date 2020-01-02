import * as Universal from "../../ast/universal";
import * as ESTree from "estree";
import {Attributes, isVoidElement} from "../syntax";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {ESTreeBuilder} from "../preprocess";
import {tagExpression} from "./util";

export class RuntimeBuilder extends ESTreeBuilder {
    constructor(
        mode: Universal.Kind,
        runtime?: string
    ) {
        super(false, mode, runtime);
    }

    private elementish(
        callee: ESTree.Expression,
        tag: ESTree.Expression | null,
        attributes: Attributes<ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        const tagish = tag !== null ? [tag] : [];
        return Operations.call(
            callee,
            ...tagish,
            Reify.object(attributes),
            this.runtime.normalizeChildren(children)
        );
    }

    element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        if (isVoidElement(tag) && children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);

        return this.elementish(
            Operations.member(this.runtime.builder(this.mode), Operations.identifier("element")),
            tagExpression(tag),
            attributes ? attributes : {},
            children
        );
    }

    macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.elementish(
            macro,
            null,
            attributes,
            children
        );
    }

    text(text: string): ESTree.Expression {
        return Operations.call(
            Operations.member(
                this.runtime.builder(this.mode),
                Operations.identifier("text")
            ),
            Reify.string(text)
        );
    }

}
