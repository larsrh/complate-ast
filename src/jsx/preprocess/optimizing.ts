import {Builder} from "../../ast/builder";
import * as Universal from "../../ast/universal";
import * as Structured from "../../ast/structured";
import * as Raw from "../../ast/raw";
import * as ESTree from "estree";
import _ from "lodash";
import {ArrayExpr} from "../../estree/expr";
import * as Reify from "../../estree/reify";
import {Attributes, escapeHTML, isDynamic, isVoidElement, normalizeAttribute} from "../syntax";
import * as Operations from "../../estree/operations";
import {mapObject} from "../../util";
import {Gensym, processStaticAttribute, tagExpression} from "./util";
import {ESTreeBuilder, extractAST, injectAST} from "../preprocess";

export class OptimizingBuilder extends ESTreeBuilder {
    private readonly builder?: Builder<Universal.AST>;
    private readonly gen: Gensym;

    constructor(
        mode: Universal.Kind,
        runtime?: string
    ) {
        super(mode !== "stream", mode, runtime);

        if (this.mode === "structured")
            this.builder = Structured.astBuilder;
        else if (this.mode === "raw")
            this.builder = Raw.astBuilder;
        // "stream" intentionally left blank

        this.gen = new Gensym("__buffer__");
    }

    private staticChildren(children: ESTree.Expression[]): Universal.AST[] | null {
        if (_.every(children, '_staticAST'))
            return children.map(child => extractAST(child as ESTree.Node)!);

        return null;
    }

    private normalizeChildren(isStaticChildren: boolean, children: ESTree.Expression[]): ArrayExpr {
        if (isStaticChildren)
        // children are statically known --> we don't have to normalize them
        // children that stem from macros may also have to be normalized (they may return a list of children
        // like `Fragment` does)
            return Reify.array(children);
        else
        // fallback: insert a call to `normalizeChildren`
        // TODO void check goes here
            return this.runtime.normalizeChildren(children);
    }

    private processAttributes(attrs: Attributes<ESTree.Expression>): Attributes<[boolean, ESTree.Expression]> {
        // this method processes attributes as much as possible
        // for each attribute, there are two possible return values:
        // 1a) truthy literal --> [true, fully_processed_expr]
        // 1b) falsy literal --> nothing
        // 2) non-literal --> [false, normalized_expr] (needs to be checked for null-ness and rendered later)

        const processed: Attributes<[boolean, ESTree.Expression]> = {};
        for (const [key, expr] of Object.entries(attrs))
            if (expr.type === "Literal") {
                const staticAttribute = processStaticAttribute(expr as ESTree.Literal);
                const normalized = normalizeAttribute(key, staticAttribute);
                if (normalized != null)
                    processed[key] = [true, Reify.string(escapeHTML(normalized))];
            }
            else {
                processed[key] = [false, this.runtime.normalizeAttribute(key, expr)];
            }

        return processed;
    }

    private bufferGenWrite(): [ESTree.Identifier, (expr: ESTree.Expression) => ESTree.Expression] {
        const buffer = this.gen.sym();

        function bufferWrite(expr: ESTree.Expression): ESTree.Expression {
            return Operations.call(
                Operations.member(buffer, Operations.identifier("write")),
                expr
            );
        }

        return [buffer, bufferWrite];
    }

    element(
        tag: string,
        _attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        const attributes = _attributes ? _attributes : {};

        // normally, we would emit a `ESTree.Node` that, when executed, evaluates to the desired JSX AST
        // this is the general case because e.g. macros can perform arbitrary computations at runtime
        // however, if `isStatic` is true, we can also compute the full JSX AST at compile-time
        // this works on a best effort basis: if a particular subtree is static, we compute it here and attach
        // it as a non-standard field in the returned `ESTree.Node`
        // caveat: we may do superfluous work here, but that's okay, since all of this happens at compile time
        const staticChildren = this.staticChildren(children);
        const isStaticChildren = staticChildren !== null;
        const isDynamicTag = isDynamic(tag);
        const isStatic =
            // stream AST can't be reified because it contains a function
            this.mode !== "stream" &&
            // all children need to be static
            isStaticChildren &&
            // all attributes must be literal
            _.every([...Object.values(attributes)], { type: "Literal" }) &&
            // tag must not be dynamic
            !isDynamicTag;

        if (isStatic) {
            // filtering out falsy attributes & void rule is done by the builder
            const staticAttributes = mapObject(attributes, value => processStaticAttribute(value as ESTree.Literal));
            const ast = this.builder!.element(
                tag,
                staticAttributes!,
                ...staticChildren!
            );
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }

        // at this point, `isStatic` is false

        // void check: note that we disallow any children if they turn out to be empty
        // e.g. <br>{null}</br> is not admissible because it is nonsensical
        // if the tag is dynamic, we need to perform the check at runtime

        const isVoid = isVoidElement(tag);
        if (!isDynamicTag && isVoid && children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);

        const normalizedChildren = this.normalizeChildren(isStaticChildren, children);

        const tagExpr = tagExpression(tag);

        let tagOpen: ESTree.Expression;
        if (isDynamicTag)
            tagOpen = Operations.binaryPlus(Reify.string("<"), tagExpr);
        else
            tagOpen = Reify.string("<" + tag);

        let tagClose: ESTree.Expression;
        if (isDynamicTag)
            tagClose = Operations.binaryPlus(Reify.string("</"), tagExpr, Reify.string(">"));
        else
            tagClose = Reify.string(`</${tag}>`);

        if (this.mode === "structured") {
            return Reify.object({
                astType: Reify.string("structured"),
                nodeType: Reify.string("element"),
                tag: tagExpr,
                // structured mode doesn't care about falsy attributes; renderers will take care of it
                attributes: Reify.object(attributes),
                children: normalizedChildren.raw
            });
        }
        else if (this.mode === "stream") {
            const [buffer, bufferWrite] = this.bufferGenWrite();
            const processedAttributes = this.processAttributes(attributes);
            const genNorm = new Gensym("__normalized__");
            const runtime = this.runtime;

            const render: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [Operations.identifier("x")],
                body: Operations.call(
                    Operations.member(Operations.identifier("x"), Operations.identifier("render")),
                    buffer
                )
            };

            function mkBodyAttr(attribute: [string, [boolean, ESTree.Expression]]): ESTree.Statement[] {
                const [key, [literal, value]] = attribute;
                function defaultWrite(value: ESTree.Expression): ESTree.Statement[] {
                    return [
                        bufferWrite(Reify.string(` ${key}="`)),
                        bufferWrite(value),
                        bufferWrite(Reify.string('"'))
                    ].map(Operations.expressionStatement);
                }

                if (literal) {
                    return defaultWrite(value);
                }
                else {
                    const sym = genNorm.sym();
                    const decl: ESTree.Statement = {
                        type: "VariableDeclaration",
                        kind: "const",
                        declarations: [{
                            type: "VariableDeclarator",
                            id: sym,
                            init: value
                        }]
                    };
                    const condition = Operations.ifthenelse(
                        Operations.notEqual(Reify.any(null), sym),
                        Operations.block(...defaultWrite(runtime.escapeHTML(sym)))
                    );
                    return [decl, condition];
                }
            }

            const bodyOpen = [
                Operations.expressionStatement(bufferWrite(tagOpen)),
                ..._.flatMap(Object.entries(processedAttributes), attribute => mkBodyAttr(attribute)),
                Operations.expressionStatement(bufferWrite(Reify.string(">")))
            ];

            const regularBodyClose = [
                normalizedChildren.forEach(render),
                bufferWrite(tagClose)
            ].map(Operations.expressionStatement);
            let bodyClose: ESTree.Statement[];
            if (isVoid)
                bodyClose = [];
            else if (!isDynamicTag)
                bodyClose = regularBodyClose;
            else
                bodyClose = [Operations.ifthenelse(
                    this.runtime.isVoidElement(tagExpr),
                    Operations.block(),
                    Operations.block(...regularBodyClose)
                )];

            return Reify.object({
                astType: Reify.string("stream"),
                render: {
                    type: "ArrowFunctionExpression",
                    expression: false,
                    params: [buffer],
                    body: Operations.block(...bodyOpen, ...bodyClose)
                }
            });
        }
        else { // raw
            const processedAttributes = this.processAttributes(attributes);
            const runtime = this.runtime;

            const selector: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [Operations.identifier("x")],
                body: Operations.member(Operations.identifier("x"), Operations.identifier("value"))
            };
            const children = normalizedChildren.map(selector);

            function mkPartAttr(attribute: [string, [boolean, ESTree.Expression]]): ESTree.Expression {
                const [key, [literal, value]] = attribute;
                function defaultString(value: ESTree.Expression): ESTree.Expression {
                    return Operations.binaryPlus(Reify.string(` ${key}="`), value, Reify.string('"'));
                }

                if (literal) {
                    return defaultString(value);
                }
                else {
                    const sym = new Gensym("__normalized__").sym();
                    const decl: ESTree.Statement = {
                        type: "VariableDeclaration",
                        kind: "const",
                        declarations: [{
                            type: "VariableDeclarator",
                            id: sym,
                            init: value
                        }]
                    };
                    const condition = Operations.ifthenelse(
                        Operations.notEqual(Reify.any(null), sym),
                        Operations.ret(defaultString(runtime.escapeHTML(sym))),
                        Operations.ret(Reify.string(""))
                    );
                    return Operations.iife(decl, condition);
                }
            }

            const partsOpen = [
                tagOpen,
                ...Object.entries(processedAttributes).map(attribute => mkPartAttr(attribute)),
                Reify.string(">"),
            ];

            let partsClosed: (ESTree.Expression | ESTree.SpreadElement)[];
            if (isVoid)
                partsClosed = [];
            else if (!isDynamicTag)
                partsClosed = [new ArrayExpr(children), tagClose];
            else
                partsClosed = [
                    new ArrayExpr(Operations.conditional(
                        this.runtime.isVoidElement(tagExpr),
                        Reify.array([]).raw,
                        children
                    )),
                    tagClose
                ];

            return Reify.object({
                astType: Reify.string("raw"),
                value: Reify.array([...partsOpen, ...partsClosed]).join(Reify.string(""))
            });
        }
    }

    macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        const normalizedChildren = this.normalizeChildren(
            this.staticChildren(children) !== null,
            children
        );

        return Operations.call(macro, Reify.object(attributes), normalizedChildren);
    }

    text(text: string): ESTree.Expression {
        if (this.mode === "structured") {
            const ast = Structured.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
        else if (this.mode === "stream") {
            const [buffer, bufferWrite] = this.bufferGenWrite();
            return Reify.object({
                astType: Reify.string("stream"),
                render: {
                    type: "ArrowFunctionExpression",
                    expression: false,
                    params: [buffer],
                    body: bufferWrite(Reify.string(escapeHTML(text)))
                }
            });
        }
        else { // raw
            const ast = Raw.astBuilder.text(text);
            const node = Reify.any(ast);
            injectAST(node, ast);
            return node;
        }
    }

}
