import * as ESTree from "estree";
import * as Operations from "../../estree/operations";
import * as Reify from "../../estree/reify";
import {ESTreeBuilder} from "../preprocess";
import {processAttributes, RuntimeModule, tagExpression} from "./util";
import {AST, ASTInfo} from "../../ast/base";
import {JSXAttribute} from "../../estree/jsx";
import {isVoidElement} from "../syntax";

export interface MetaASTInfo<A extends AST> extends ASTInfo<A> {
    fragmentMacro(runtime: RuntimeModule): ESTree.Expression;
    runtimeBuilder(runtime: RuntimeModule): ESTree.Expression;
}

export class RuntimeBuilder extends ESTreeBuilder {
    private readonly runtimeBuilder: ESTree.Expression;

    constructor(
        private readonly runtime: RuntimeModule,
        info: MetaASTInfo<any>
    ) {
        super(false, info.fragmentMacro(runtime));
        this.runtimeBuilder = info.runtimeBuilder(runtime);
    }

    elementOrMacro(
        tag: string | ESTree.Expression,
        attributes: JSXAttribute[],
        children: ESTree.Expression[]
    ): ESTree.Expression {
        let callee: ESTree.Expression;
        const args: ESTree.Expression[] = [];
        if (typeof tag === "string") {
            // TODO duplicated logic with optimizing builder
            if (isVoidElement(tag) && children.length > 0)
                throw new Error(`Void element ${tag} must not have children`);

            callee = Operations.member(this.runtimeBuilder, Operations.identifier("element"));
            args.push(tagExpression(tag));
        }
        else {
            callee = tag;
        }

        return Operations.call(
            callee,
            ...args,
            processAttributes(attributes).merged,
            this.runtime.normalizeChildren(children)
        )
    }

    text(text: string): ESTree.Expression {
        return Operations.call(
            Operations.member(
                this.runtimeBuilder,
                Operations.identifier("text")
            ),
            Reify.string(text)
        );
    }

}
