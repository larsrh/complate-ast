import * as Structured from "../../ast/structured";
import * as ESTree from "estree";
import * as Reify from "../../estree/reify";
import {Attributes} from "../syntax";
import * as Operations from "../../estree/operations";
import {Runtime} from "./util";
import {ESTreeBuilder, injectAST} from "../preprocess";
import {processChildren, ProcessedAttributes, ProcessedChildren, Tag} from "./optimizing/util";

export interface Factory {
    makeElement(runtime: Runtime, tag: Tag, attributes: ProcessedAttributes, children: ProcessedChildren): ESTree.Expression;
    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression;
}

export class OptimizingBuilder extends ESTreeBuilder {
    constructor(
        private readonly factory: Factory,
        runtime: Runtime
    ) {
        super(true, runtime);
    }

    private reified(ast: Structured.AST): ESTree.Expression {
        const node = this.factory.reify(this.runtime, ast);
        injectAST(node, ast);
        return node;
    }

    element(
        _tag: string,
        _attributes?: Attributes<ESTree.Expression>,
        ..._children: ESTree.Expression[]
    ): ESTree.Expression {
        const attributes = ProcessedAttributes.fromExpressions(_attributes ? _attributes : {});
        const children = processChildren(_children);
        const tag = new Tag(_tag);

        // normally, we would emit a `ESTree.Node` that, when executed, evaluates to the desired JSX AST
        // this is the general case because e.g. macros can perform arbitrary computations at runtime
        // however, if everything is static, we can also compute the full JSX AST at compile-time
        // this works on a best effort basis: if a particular subtree is static, we compute it here and attach
        // it as a non-standard field in the returned `ESTree.Node`
        // caveat: we may do superfluous work here, but that's okay, since all of this happens at compile time
        if (children.isStatic && attributes.isStatic && !tag.isDynamic) {
            // checking void rule is done by the builder
            const ast = Structured.astBuilder.element(
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

    macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        return Operations.call(macro, Reify.object(attributes), processChildren(children).normalized(this.runtime));
    }

    text(text: string): ESTree.Expression {
        return this.reified(Structured.astBuilder.text(text));
    }
}
