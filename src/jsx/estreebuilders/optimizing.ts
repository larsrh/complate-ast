import {AST, ASTBuilder} from "../../ast/structured";
import * as ESTree from "estree-jsx";
import {ProcessedAttributes} from "./util";
import {DynamicProcessedChildren, ProcessedChildren, RichNode, StaticProcessedChildren, Tag} from "./optimizing/util";
import {ESTreeBuilder} from "../estreebuilder";
import {RuntimeModule} from "../runtime";
import {every} from "../../util";

export function hasAST(node: ESTree.BaseNode): node is RichNode {
    return (node as any)._staticAST;
}

export interface Factory {
    readonly kind: string;
    makeElement(runtime: RuntimeModule, tag: Tag, attributes: ProcessedAttributes, children: ProcessedChildren): ESTree.Expression;
    reify(runtime: RuntimeModule, ast: AST): ESTree.Expression;
}

const builder = new ASTBuilder();

export class OptimizingBuilder extends ESTreeBuilder {
    constructor(
        private readonly factory: Factory,
        private readonly runtime: RuntimeModule
    ) {
        super(true);
    }

    private reified(ast: AST): ESTree.Expression {
        const node = this.factory.reify(this.runtime, ast);
        (node as RichNode)._staticAST = ast;
        return node;
    }

    private processChildren(_children: ESTree.Expression[]): ProcessedChildren {
        const children = _children.map(child => {
            if (hasAST(child))
                return child;
            // TODO expand to more value types
            if (child.type === "Literal" && typeof child.value === "string")
                return this.reified(builder.text(child.value));

            return child;
        });

        const maybeStatic = every(children, child => {
            if (hasAST(child))
                return child;
            else
                return false;
        });
        if (maybeStatic !== false)
            return StaticProcessedChildren.fromExpressions(maybeStatic);
        else
            return new DynamicProcessedChildren(children);
    }

    jsxElement(
        _tag: string,
        attributes: ProcessedAttributes,
        _children: ESTree.Expression[]
    ): ESTree.Expression {
        const children = this.processChildren(_children);
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
            const ast = builder.element(
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

    text(text: string): ESTree.Expression {
        return this.reified(builder.text(text));
    }
}
