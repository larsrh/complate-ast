import * as Structured from "../../ast/structured";
import * as ESTree from "estree";
import * as Operations from "../../estree/operations";
import {ProcessedAttributes, RuntimeModule} from "./util";
import {ESTreeBuilder, injectAST} from "../preprocess";
import {processChildren, ProcessedChildren, Tag} from "./optimizing/util";

export interface Factory {
    makeElement(runtime: RuntimeModule, tag: Tag, attributes: ProcessedAttributes, children: ProcessedChildren): ESTree.Expression;
    reify(runtime: RuntimeModule, ast: Structured.AST): ESTree.Expression;
}

export class OptimizingBuilder extends ESTreeBuilder {
    constructor(
        private readonly factory: Factory,
        private readonly runtime: RuntimeModule
    ) {
        super(true, runtime._member("Fragment"));
    }

    private reified(ast: Structured.AST): ESTree.Expression {
        const node = this.factory.reify(this.runtime, ast);
        injectAST(node, ast);
        return node;
    }

    elementOrMacro(
        _tag: string | ESTree.Expression,
        attributes: ProcessedAttributes,
        _children: ESTree.Expression[]
    ): ESTree.Expression {
        if (typeof _tag === "string") {
            const children = processChildren(_children);
            const tag = new Tag(_tag);

            // normally, we would emit a `ESTree.Node` that, when executed, evaluates to the desired JSX AST
            // this is the general case because e.g. macros can perform arbitrary computations at runtime
            // however, if everything is static, we can also compute the full JSX AST at compile-time
            // this works on a best effort basis: if a particular subtree is static, we compute it here and attach
            // it as a non-standard field in the returned `ESTree.Node`
            // caveat: we may do superfluous work here, but that's okay, since all of this happens at compile time
            if (
                children.isStatic &&
                !attributes.containsSpread &&
                attributes.isStatic &&
                !tag.isDynamic
            ) {
                // checking void rule is done by the builder
                const ast = Structured.info.builder.element(
                    _tag,
                    attributes.statics,
                    ...children.children
                );
                return this.reified(ast);
            }

            // at this point, something is not static

            // void check: note that we disallow any children if they turn out to be empty
            // e.g. <br>{null}</br> is not admissible because it is nonsensical
            // if the tag is dynamic, we need to perform the check at runtime

            if (!tag.isDynamic && tag.isVoid && !children.isEmpty)
                throw new Error(`Void element ${tag} must not have children`);

            return this.factory.makeElement(
                this.runtime,
                tag,
                attributes,
                children
            );
        }
        else {
            return Operations.call(
                _tag,
                attributes.merged,
                processChildren(_children).normalized(this.runtime)
            );
        }
    }

    text(text: string): ESTree.Expression {
        return this.reified(Structured.info.builder.text(text));
    }
}
