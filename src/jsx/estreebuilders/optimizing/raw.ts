import {Gensym, ProcessedAttributes} from "../util";
import {ProcessedChildren, Tag} from "./util";
import * as ESTree from "estree";
import * as Operations from "../../../estree/operations";
import * as Reify from "../../../estree/reify";
import {ArrayExpr} from "../../../estree/expr";
import * as Structured from "../../../ast/structured";
import * as Raw from "../../../ast/raw";
import {Factory} from "../optimizing";
import {RuntimeModule} from "../../runtime";

export class RawFactory implements Factory {
    readonly kind = "raw";

    makeElement(
        runtime: RuntimeModule,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
        const gen = new Gensym("__normalized__");

        const selector: ESTree.ArrowFunctionExpression = {
            type: "ArrowFunctionExpression",
            expression: true,
            params: [Operations.identifier("x")],
            body: Operations.member(Operations.identifier("x"), Operations.identifier("value"))
        };

        function mkDynamicAttr(key: string, value: ESTree.Expression): ESTree.Expression {
            const sym = gen.sym();
            const decl: ESTree.Statement = {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [{
                    type: "VariableDeclarator",
                    id: sym,
                    init: runtime.normalizeAttribute(value)
                }]
            };
            const condition =
                Operations.ifthenelse(
                    Operations.equal(Reify.boolean(true), sym),
                    Operations.ret(Reify.string(` ${key}`)),
                    Operations.ifthenelse(
                        Operations.notEqual(Reify.any(null), sym),
                        Operations.ret(Operations.plus(Reify.string(` ${key}="`), runtime.escapeHTML(sym), Reify.string('"'))),
                        Operations.ret(Reify.string(""))
                    )
            );
            return Operations.iife(decl, condition);
        }

        const partsAttrs: ESTree.Expression[] = [];
        if (attributes.containsSpread) {
            partsAttrs.push(runtime.renderAttributes(attributes.merged));
        }
        else {
            partsAttrs.push(Reify.string(attributes.staticString));
            for (const [key, value] of Object.entries(attributes.dynamics))
                partsAttrs.push(mkDynamicAttr(key, value));
        }

        const partsOpen = [
            tag.open,
            ...partsAttrs,
            Reify.string(">"),
        ];

        let partsChildren: ArrayExpr;
        if (children.isStatic)
            partsChildren = Reify.array([Reify.string(children.staticString)]);
        else
            partsChildren = children.normalized(this.kind, runtime).map(selector);

        let partsClosed: (ESTree.Expression | ESTree.SpreadElement)[];
        if (tag.isVoid)
            partsClosed = [];
        else if (!tag.isDynamic)
            partsClosed = [partsChildren, tag.close];
        else
            partsClosed = [
                new ArrayExpr(Operations.conditional(
                    runtime.isVoidElement(tag.expr),
                    Reify.array([]).raw,
                    partsChildren.raw
                )),
                tag.close
            ];

        return Reify.object({
            astKind: Reify.string("raw"),
            value: Reify.array([...partsOpen, ...partsClosed]).join(Reify.string(""))
        });
    }

    reify(runtime: RuntimeModule, ast: Structured.AST): ESTree.Expression {
        return Reify.any(Structured.render(ast, Raw.info.builder));
    }
}
