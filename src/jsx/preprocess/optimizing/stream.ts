import * as ESTree from "estree";
import * as Operations from "../../../estree/operations";
import {Gensym, Runtime} from "../util";
import * as Reify from "../../../estree/reify";
import {ProcessedAttributes, ProcessedChildren, StaticProcessedChildren, Tag} from "./util";
import {escapeHTML} from "../../syntax";
import {ArrayExpr} from "../../../estree/expr";
import * as Structured from "../../../ast/structured";
import {Factory} from "../optimizing";

function bufferWrite(buffer: ESTree.Expression, expr: ESTree.Expression): ESTree.ExpressionStatement {
    return Operations.expressionStatement(Operations.call(
        Operations.member(buffer, Operations.identifier("write")),
        expr
    ));
}

export class StreamFactory implements Factory {
    private readonly gen: Gensym;

    constructor() {
        this.gen = new Gensym("__buffer__");
    }

    make(isElement: boolean, body: (buffer: ESTree.Expression) => ESTree.Statement[]): ESTree.Expression {
        const buffer = this.gen.sym();

        return Reify.object({
            astType: Reify.string("stream"),
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
        runtime: Runtime,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
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

            function onlyIfNotExtra(doCheck: boolean, key: ESTree.Expression, ...statements: ESTree.Statement[]): ESTree.Statement[] {
                if (doCheck)
                    return [Operations.ifthenelse(
                        Operations.not(Operations.isin(key, extraAttributes)),
                        Operations.block(...statements)
                    )];
                else
                    return statements;
            }

            function mkStaticAttrs(doCheck: boolean): ESTree.Statement[] {
                if (doCheck) {
                    const statements: ESTree.Statement[] = [];
                    for (const [key, value] of Object.entries(attributes.statics))
                        statements.push(...onlyIfNotExtra(
                            true,
                            Reify.string(key),
                            bufferWrite(buffer, Reify.string(` ${key}="${escapeHTML(value)}"`))
                        ));
                    return statements;
                }
                else {
                    return [bufferWrite(buffer, Reify.string(attributes.staticString))]
                }
            }

            function mkDynamicAttr(doCheck: boolean, key: ESTree.Expression, value: ESTree.Expression): ESTree.Statement[] {
                const sym = genNorm.sym();
                const decl: ESTree.Statement = {
                    type: "VariableDeclaration",
                    kind: "const",
                    declarations: [{
                        type: "VariableDeclarator",
                        id: sym,
                        init: runtime.normalizeAttribute(key, value)
                    }]
                };
                const condition = Operations.ifthenelse(
                    Operations.notEqual(Reify.any(null), sym),
                    Operations.block(
                        bufferWrite(buffer, Operations.binaryPlus(Reify.string(" "), key, Reify.string(`="`))),
                        bufferWrite(buffer, runtime.escapeHTML(sym)),
                        bufferWrite(buffer, Reify.string('"'))
                    )
                );

                return onlyIfNotExtra(
                    doCheck,
                    key,
                    decl,
                    condition
                );
            }

            function mkDynamicAttrs(doCheck: boolean): ESTree.Statement[] {
                const statements: ESTree.Statement[] = [];
                for (const [key, value] of Object.entries(attributes.dynamics))
                    statements.push(...mkDynamicAttr(doCheck, Reify.string(key), value));
                return statements;
            }

            const extraKey = new Gensym("__key__").sym();

            const bodyExtraAttrs: ESTree.Statement = {
                type: "ForInStatement",
                left: {
                    type: "VariableDeclaration",
                    kind: "const",
                    declarations: [{
                        type: "VariableDeclarator",
                        id: extraKey
                    }]
                },
                right: extraAttributes,
                body: Operations.block(
                    ...mkDynamicAttr(false, extraKey, Operations.member(extraAttributes, extraKey, true))
                )
            };

            const bodyAttrs =
                Operations.ifthenelse(
                    Operations.equal(extraAttributes, Reify.any(undefined)),
                    Operations.block(
                        ...mkStaticAttrs(false),
                        ...mkDynamicAttrs(false)
                    ),
                    Operations.block(
                        ...mkStaticAttrs(true),
                        ...mkDynamicAttrs(true),
                        bodyExtraAttrs
                    )
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
                bodyChildren = Operations.expressionStatement(children.normalized(runtime).forEach(render));

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

    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression {
        if (Structured.isText(ast)) {
            return this.make(
                false,
                (buffer) => [bufferWrite(buffer, Reify.string(escapeHTML(ast.text)))]
            );
        }
        else if (Structured.isElement(ast)) {
            return this.makeElement(
                runtime,
                new Tag(ast.tag),
                ProcessedAttributes.fromAttributeValues(ast.attributes),
                StaticProcessedChildren.fromASTs(ast.children)
            );
        }
        else {
            throw new Error("Cannot reify prerendered element");
        }
    }
}
