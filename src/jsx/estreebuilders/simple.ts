import * as ESTree from "estree";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {ProcessedAttributes, tagExpression} from "./util";
import {isVoidElement} from "../syntax";
import {ESTreeBuilder} from "../estreebuilder";
import {RuntimeModule} from "../runtime";

export class SimpleBuilder extends ESTreeBuilder {
    constructor(
        private readonly runtime: RuntimeModule,
        private readonly kind: string
    ) {
        super(false);
    }

    elementOrMacro(
        tag: string | ESTree.Expression,
        attributes: ProcessedAttributes,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        let callee: ESTree.Expression;
        const args: ESTree.Expression[] = [];
        if (typeof tag === "string") {
            // TODO duplicated logic with optimizing builder
            if (isVoidElement(tag) && children.length > 0)
                throw new Error(`Void element ${tag} must not have children`);

            callee = Operations.member(this.runtime.builder(this.kind), Operations.identifier("element"));
            args.push(tagExpression(tag));
        }
        else {
            callee = tag;
        }

        return Operations.call(
            callee,
            ...args,
            attributes.merged,
            this.runtime.normalizeChildren(this.kind, children)
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
