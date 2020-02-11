import * as ESTree from "estree";
import * as Operations from "../../estree/operations";
import {ProcessedAttributes, tagExpression} from "./util";
import {isVoidElement} from "../syntax";
import {ESTreeBuilder} from "../estreebuilder";
import {RuntimeModule} from "../runtime";
import * as Reify from "../../estree/reify";

export class SimpleBuilder extends ESTreeBuilder {
    constructor(
        private readonly runtime: RuntimeModule,
        private readonly kind: string
    ) {
        super(false);
    }

    jsxElement(
        tag: string,
        attributes: ProcessedAttributes,
        _children: ESTree.Expression[]
    ): ESTree.Expression {
        // TODO duplicated logic with optimizing builder
        if (isVoidElement(tag) && _children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);

        const callee = Operations.member(this.runtime.builder(this.kind), Operations.identifier("element"));
        const children = this.runtime.normalizeChildren(this.kind, _children);

        return Operations.call(
            callee,
            tagExpression(tag),
            attributes.merged,
            children
        )
    }

    text(text: string): ESTree.Expression {
        return Operations.call(
            Operations.member(
                this.runtime.builder(this.kind),
                Operations.identifier("text")
            ),
            Reify.string(text)
        );
    }
}
