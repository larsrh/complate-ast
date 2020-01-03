import * as Universal from "../../ast/universal";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import * as ESTree from "estree";
import {ArrayExpr} from "../../estree/expr";
import * as Reify from "../../estree/reify";
import {Attributes, escapeHTML, isDynamic, isVoidElement, normalizeAttribute, normalizeAttributes} from "../syntax";
import * as Operations from "../../estree/operations";
import {assertUnreachable, mapObject} from "../../util";
import {Gensym, processStaticAttribute, Runtime, tagExpression} from "./util";
import {ESTreeBuilder, extractAST, injectAST} from "../preprocess";
import _ from "lodash";

class Tag {
    readonly expr: ESTree.Expression;
    readonly isVoid: boolean;
    readonly isDynamic: boolean;
    readonly open: ESTree.Expression;
    readonly close: ESTree.Expression;

    constructor(
        private readonly tag: string
    ) {
        this.isDynamic = isDynamic(tag);
        this.expr = tagExpression(tag);
        this.isVoid = isVoidElement(tag);

        if (this.isDynamic)
            this.open = Operations.binaryPlus(Reify.string("<"), this.expr);
        else
            this.open = Reify.string("<" + tag);

        if (this.isDynamic)
            this.close = Operations.binaryPlus(Reify.string("</"), this.expr, Reify.string(">"));
        else
            this.close = Reify.string(`</${tag}>`);
    }
}

class ProcessedAttributes {
    private constructor(
        readonly statics: Attributes<string> = {},
        readonly dynamics: Attributes<ESTree.Expression> = {}
    ) {}

    get isStatic(): boolean {
        return Object.keys(this.dynamics).length === 0;
    }

    get reified(): ESTree.Expression {
        return Reify.object(Object.assign({}, this.dynamics, mapObject(this.statics, Reify.string)));
    }

    get staticString(): string {
        let result = "";
        for (const [key, value] of Object.entries(this.statics))
            result += ` ${key}="${escapeHTML(value)}"`;
        return result;
    }

    static fromAttributeValues(attributes: Attributes): ProcessedAttributes {
        return new ProcessedAttributes(normalizeAttributes(false, attributes));
    }

    static fromExpressions(attrs: Attributes<ESTree.Expression>): ProcessedAttributes {
        // for each attribute, there are two possible buckets:
        // 1a) truthy literal --> static: string (already normalized, needs to be escaped later)
        // 1b) falsy literal --> nothing
        // 2) non-literal --> dynamic: expr (needs to be normalized, checked for null-ness and rendered later)

        const processed = new ProcessedAttributes();
        for (const [key, expr] of Object.entries(attrs))
            if (expr.type === "Literal") {
                const staticAttribute = processStaticAttribute(expr as ESTree.Literal);
                const normalized = normalizeAttribute(key, staticAttribute);
                if (normalized != null)
                    processed.statics[key] = normalized;
            }
            else {
                processed.dynamics[key] = expr;
            }

        return processed;
    }

}

interface BaseProcessedChildren {
    isStatic: boolean;
    isEmpty: boolean;
    normalized(runtime: Runtime): ArrayExpr;
}

class StaticProcessedChildren implements BaseProcessedChildren {
    readonly isStatic: true = true;
    readonly isEmpty: boolean;
    private constructor(
        readonly children: Structured.AST[],
        private readonly raw: ESTree.Expression[],
    ) {
        this.isEmpty = this.children.length === 0;
    }

    get staticString(): string {
        return this.children.map(child => Structured.render(child, Raw.astBuilder).value).join("");
    }

    normalized(): ArrayExpr {
        return Reify.array(this.raw);
    }

    static fromASTs(children: Structured.AST[]): StaticProcessedChildren {
        return new StaticProcessedChildren(children, children.map(Reify.any));
    }

    static fromExpressions(raw: ESTree.Expression[]): StaticProcessedChildren {
        return new StaticProcessedChildren(raw.map(child => extractAST(child as ESTree.BaseNode)!), raw);
    }
}

class DynamicProcessedChildren implements BaseProcessedChildren {
    readonly isStatic: false = false;
    readonly isEmpty: boolean;
    constructor(
        readonly raw: ESTree.Expression[]
    ) {
        this.isEmpty = this.raw.length === 0;
    }

    normalized(runtime: Runtime): ArrayExpr {
        return runtime.normalizeChildren(this.raw);
    }
}

type ProcessedChildren = StaticProcessedChildren | DynamicProcessedChildren

function processChildren(children: ESTree.Expression[]): ProcessedChildren {
    if (_.every(children, '_staticAST'))
        return StaticProcessedChildren.fromExpressions(children);
    else
        return new DynamicProcessedChildren(children);
}

interface Factory {
    makeElement(runtime: Runtime, tag: Tag, attributes: ProcessedAttributes, children: ProcessedChildren): ESTree.Expression;
    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression;
}

class RawFactory implements Factory {
    makeElement(
        runtime: Runtime,
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

        const staticAttributeString = attributes.staticString;

        function mkDynamicAttr(key: string, value: ESTree.Expression): ESTree.Expression {
            function defaultString(value: ESTree.Expression): ESTree.Expression {
                return Operations.binaryPlus(Reify.string(` ${key}="`), value, Reify.string('"'));
            }

            const sym = gen.sym();
            const decl: ESTree.Statement = {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [{
                    type: "VariableDeclarator",
                    id: sym,
                    init: runtime.normalizeAttribute(Reify.string(key), value)
                }]
            };
            const condition = Operations.ifthenelse(
                Operations.notEqual(Reify.any(null), sym),
                Operations.ret(defaultString(runtime.escapeHTML(sym))),
                Operations.ret(Reify.string(""))
            );
            return Operations.iife(decl, condition);
        }

        const partsAttrs: ESTree.Expression[] = [Reify.string(staticAttributeString)];
        for (const [key, value] of Object.entries(attributes.dynamics))
            partsAttrs.push(mkDynamicAttr(key, value));

        const partsOpen = [
            tag.open,
            ...partsAttrs,
            Reify.string(">"),
        ];

        let partsChildren: ArrayExpr;
        if (children.isStatic)
            partsChildren = Reify.array([Reify.string(children.staticString)]);
        else
            partsChildren = children.normalized(runtime).map(selector);

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
            astType: Reify.string("raw"),
            value: Reify.array([...partsOpen, ...partsClosed]).join(Reify.string(""))
        });
    }

    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression {
        return Reify.any(Structured.render(ast, Raw.astBuilder));
    }
}

function bufferWrite(buffer: ESTree.Expression, expr: ESTree.Expression): ESTree.ExpressionStatement {
    return Operations.expressionStatement(Operations.call(
        Operations.member(buffer, Operations.identifier("write")),
        expr
    ));
}

class StreamFactory implements Factory {
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
            assertUnreachable();
        }
    }
}

class StructuredFactory implements Factory {

    makeElement(
        runtime: Runtime,
        tag: Tag,
        attributes: ProcessedAttributes,
        children: ProcessedChildren
    ): ESTree.Expression {
        return Reify.object({
            astType: Reify.string("structured"),
            nodeType: Reify.string("element"),
            tag: tag.expr,
            // structured mode doesn't care about falsy attributes; renderers will take care of it
            attributes: attributes.reified,
            children: children.normalized(runtime).raw
        });
    }

    reify(runtime: Runtime, ast: Structured.AST): ESTree.Expression {
        return Reify.any(ast);
    }

}

export class OptimizingBuilder extends ESTreeBuilder {
    private readonly factory: Factory;

    constructor(
        mode: Universal.Kind,
        runtime?: string
    ) {
        super(true, mode, runtime);

        if (mode === "structured")
            this.factory = new StructuredFactory();
        else if (mode === "stream")
            this.factory = new StreamFactory();
        else
            this.factory = new RawFactory();
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
