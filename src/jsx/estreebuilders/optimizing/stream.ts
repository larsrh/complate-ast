import * as ESTree from "estree";
import * as Operations from "../../../estree/operations";
import {NoSpreadProcessedAttributes, ProcessedAttributes} from "../util";
import * as Reify from "../../../estree/reify";
import {Gensym, ProcessedChildren, StaticProcessedChildren, Tag} from "./util";
import {Attributes, escapeHTML, renderAttributes} from "../../syntax";
import {ArrayExpr} from "../../../estree/expr";
import * as Structured from "../../../ast/structured";
import {Factory} from "../optimizing";
import {RuntimeModule} from "../../runtime";

function bufferWrite(buffer: ESTree.Expression, expr: ESTree.Expression): ESTree.ExpressionStatement {
    return Operations.expressionStatement(Operations.call(
        Operations.member(buffer, Operations.identifier("write")),
        expr
    ));
}

export class StreamFactory implements Factory {
    readonly kind = "stream";
    private readonly gen: Gensym;

    constructor() {
        this.gen = new Gensym("__buffer__");
    }

    make(isElement: boolean, body: (buffer: ESTree.Expression) => ESTree.Statement[]): ESTree.Expression {
        const buffer = this.gen.sym();

        return Reify.object({
            astKind: Reify.string("stream"),
            isElement: Reify.boolean(isElement),
            render: {
                type: "FunctionExpression",
                params: [buffer],
                body: {
                    type: "BlockStatement",
                    body: body(buffer)
                }
            }
        });
    }

    makeElement(
        runtime: RuntimeModule,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
        const thisFactory = this;
        const genNorm = new Gensym("__normalized__");
        const extraChildren = Operations.member({ type: "ThisExpression" }, Operations.identifier("_extraChildren"));
        const extraAttributes = Operations.member({ type: "ThisExpression" }, Operations.identifier("_extraAttributes"));

        function make(buffer: ESTree.Expression): ESTree.Statement[] {
            const render: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [Operations.identifier("x")],
                body: Operations.call(
                    Operations.member(Operations.identifier("x"), Operations.identifier("render")),
                    buffer
                )
            };

            function mkDynamicAttr(key: ESTree.Expression, value: ESTree.Expression): ESTree.Statement[] {
                const sym = genNorm.sym();
                const decl: ESTree.Statement = {
                    type: "VariableDeclaration",
                    kind: "const",
                    declarations: [{
                        type: "VariableDeclarator",
                        id: sym,
                        init: runtime.normalizeAttribute(value)
                    }]
                };
                const condition = Operations.ifthenelse(
                    Operations.equal(Reify.boolean(true), sym),
                    Operations.block(
                        bufferWrite(buffer, Operations.plus(Reify.string(" "), key))
                    ),
                    Operations.ifthenelse(
                        Operations.notEqual(Reify.any(null), sym),
                        Operations.block(
                            bufferWrite(buffer, Operations.plus(Reify.string(" "), key, Reify.string(`="`))),
                            bufferWrite(buffer, runtime.escapeHTML(sym)),
                            bufferWrite(buffer, Reify.string('"'))
                        )
                    )
                );

                return [decl, condition];
            }

            function mkDynamicAttrs(dynamics: Attributes<ESTree.Expression>): ESTree.Statement[] {
                const statements: ESTree.Statement[] = [];
                for (const [key, value] of Object.entries(dynamics))
                    statements.push(...mkDynamicAttr(Reify.string(key), value));
                return statements;
            }

            const fallbackBodyAttrs = bufferWrite(
                buffer,
                runtime.renderAttributes(
                    Operations.object(
                        { type: "SpreadElement", argument: attributes.merged },
                        { type: "SpreadElement", argument: extraAttributes }
                    )
                )
            );

            let bodyAttrs: ESTree.Statement;
            if (attributes.containsSpread)
                bodyAttrs = fallbackBodyAttrs;
            else
                bodyAttrs = Operations.ifthenelse(
                    Operations.equal(extraAttributes, Reify.any(undefined)),
                    Operations.block(
                        bufferWrite(buffer, Reify.string(renderAttributes(attributes.statics))),
                        ...mkDynamicAttrs(attributes.dynamics)
                    ),
                    Operations.block(fallbackBodyAttrs)
                );

            const bodyOpen = [
                bufferWrite(buffer, tag.open),
                bodyAttrs,
                bufferWrite(buffer, Reify.string(">"))
            ];

            let bodyChildren: ESTree.Statement;
            if (children.isStatic)
                bodyChildren = bufferWrite(buffer, Reify.string(children.staticString));
            else
                bodyChildren = Operations.expressionStatement(children.normalized(thisFactory.kind, runtime).forEach(render));

            const bodyExtraChildren = Operations.ifthenelse(
                extraChildren,
                Operations.expressionStatement(new ArrayExpr(extraChildren).forEach(render))
            );

            const defaultBodyClose = [
                bodyChildren,
                bodyExtraChildren,
                bufferWrite(buffer, tag.close)
            ];

            let bodyClose: ESTree.Statement[];
            if (tag.isVoid)
                bodyClose = [];
            else if (!tag.isDynamic)
                bodyClose = defaultBodyClose;
            else
                bodyClose = [Operations.ifthenelse(
                    runtime.isVoidElement(tag.expr),
                    Operations.block(),
                    Operations.block(...defaultBodyClose)
                )];

            return [...bodyOpen, ...bodyClose];
        }

        return this.make(true, make);
    }

    reify(runtime: RuntimeModule, ast: Structured.AST): ESTree.Expression {
        switch (ast.nodeType) {
            case "text":
                return this.make(
                    false,
                    (buffer) => [bufferWrite(buffer, Reify.string(escapeHTML(ast.text)))]
                );
            case "element":
                return this.makeElement(
                    runtime,
                    new Tag(ast.tag),
                    NoSpreadProcessedAttributes.fromAttributeValues(ast.attributes),
                    StaticProcessedChildren.fromASTs(ast.children)
                );
            case "prerendered":
                throw new Error("Cannot reify prerendered element");
        }
    }
}
