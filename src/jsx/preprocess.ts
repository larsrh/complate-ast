import {Parser} from "acorn";
import {walk} from "estree-walker";
import * as ESTree from "estree";
import * as Reify from "../estree/reify";
import * as Operations from "../estree/operations";
import * as Universal from "../ast/universal";
import * as Structured from "../ast/structured";
import * as Raw from "../ast/raw";
import {JSXElement, JSXExpressionContainer, JSXFragment, JSXText} from "../estree/jsx";
import _ from "lodash";
import {Attributes, AttributeValue, Builder} from "../ast/builder";
import {isMacro, escapeHTML, isVoidElement, isDynamic} from "./syntax";
import {Object, mapObject} from "../util";

// TODO use import
const jsx = require("acorn-jsx");

export const acorn = Parser.extend(jsx());

export function extractAST(node: ESTree.Node): Universal.AST | null {
    const richNode = node as any as { _static_ast?: Universal.AST };
    if (richNode._static_ast)
        return richNode._static_ast;
    else
        return null;
}

function injectAST(node: ESTree.Node, ast: Universal.AST) {
    (node as any)._static_ast = ast;
}

function runtimeExpression(runtime?: string): ESTree.Identifier {
    return Operations.identifier(runtime === undefined ? "JSXRuntime" : runtime);
}

class Runtime {
    constructor(
        private readonly runtime: ESTree.Expression,
        private readonly mode: Universal.Kind
    ) {}

    private member(name: string): ESTree.Expression {
        return Operations.member(this.runtime, Operations.identifier(name));
    }

    private call(name: string, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.Expression {
        return Operations.call(this.member(name), ...args);
    }

    builder(mode: Universal.Kind): ESTree.Expression {
        return this.member(`${mode}Builder`);
    }

    normalizeChildren(children: ESTree.Expression[]): ESTree.Expression {
        return this.call(
            "normalizeChildren",
            Reify.string(this.mode),
            ...children
        );
    }

    escapeHTML(argument: ESTree.Expression): ESTree.Expression {
        return this.call("escapeHTML", argument);
    }

    get fragment(): ESTree.Expression {
        return this.member("Fragment");
    }

    isVoidElement(argument: ESTree.Expression): ESTree.Expression {
        return this.call("isVoidElement", argument);
    }
}

// TODO use hygiene?
class Gensym {
    private counter: bigint;

    constructor(
        readonly prefix: string
    ) {
        this.counter = BigInt(0);
    }

    sym(): ESTree.Identifier {
        this.counter += BigInt(1);
        return Operations.identifier(this.prefix + this.counter);
    }
}

export abstract class ESTreeBuilder implements Builder<ESTree.Expression, ESTree.Expression, ESTree.Expression> {
    readonly runtime: Runtime;

    constructor(
        readonly canStatic: boolean,
        readonly mode: Universal.Kind,
        runtime?: string
    ) {
        this.runtime = new Runtime(runtimeExpression(runtime), mode);
    }

    abstract element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression;

    abstract text(text: string): ESTree.Expression;

    prerendered(p: ESTree.Expression): ESTree.Expression {
        return p;
    }

    attributeValue(value: AttributeValue): ESTree.Expression {
        return Reify.any(value);
    }
}

export class RuntimeBuilder extends ESTreeBuilder {
    constructor(
        mode: Universal.Kind,
        runtime?: string
    ) {
        super(false, mode, runtime);
    }

    private elementish(
        callee: ESTree.Expression,
        tag: string | null,
        attributes: Attributes<ESTree.Expression>,
        children: ESTree.Expression[]
    ): ESTree.Expression {
        const tagish = tag !== null ? [Reify.string(tag)] : [];
        return Operations.call(
            callee,
            ...tagish,
            Reify.object(attributes),
            Reify.esarray(this.runtime.normalizeChildren(children)).spread()
        );
    }

    element(
        tag: string,
        attributes?: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        if (isVoidElement(tag) && children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);
        if (isDynamic(tag))
            throw new Error(`Dynamic element ${tag} not supported in runtime mode (requires "eval")`);

        return this.elementish(
            Operations.member(this.runtime.builder(this.mode), Operations.identifier("element")),
            tag,
            attributes ? attributes : {},
            children
        );
    }

    macro(
        macro: ESTree.Expression,
        attributes: Attributes<ESTree.Expression>,
        ...children: ESTree.Expression[]
    ): ESTree.Expression {
        return this.elementish(
            macro,
            null,
            attributes,
            children
        );
    }

    text(text: string): ESTree.Expression {
        return Operations.call(
            Operations.member(
                this.runtime.builder(this.mode),
                Operations.identifier("text")
            ),
            Reify.string(text)
        );
    }
}

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
        if (_.every(children, '_static_ast')) {
            const staticChildren = children.map(child => extractAST(child as ESTree.Node)!);

            if (!_.every(staticChildren, { astType: this.mode }))
                throw new Error(`Bug: ${this.mode} node contains static, non-${this.mode} children`);

            return staticChildren;
        }

        return null;
    }

    private normalizeChildren(isStaticChildren: boolean, children: ESTree.Expression[]): ESTree.Expression {
        if (isStaticChildren)
            // children are statically known --> we don't have to normalize them
            // children that stem from macros may also have to be normalized (they may return a list of children
            // like `Fragment` does)
            return Reify.array(children);
        else
            // fallback: insert a call to `normalizeChildren`
            return this.runtime.normalizeChildren(children);
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
        const attributes: Attributes<ESTree.Expression> = _attributes ? _attributes : {};

        // normally, we would emit a `ESTree.Node` that, when executed, evaluates to the desired JSX AST
        // this is the general case because e.g. macros can perform arbitrary computations at runtime
        // however, if `isStatic` is true, we can also compute the full JSX AST at compile-time
        // this works on a best effort basis: if a particular subtree is static, we compute it here and attach
        // it as a non-standard field in the returned `ESTree.Node`
        // caveat: we may do superfluous work here, but that's okay, since all of this happens at compile time
        const staticChildren = this.staticChildren(children);
        const isStaticChildren = staticChildren !== null;
        const isStaticAttributes = _.every([...Object.values(attributes)], { type: "Literal" });
        const isDynamicTag = isDynamic(tag);
        const isStatic =
            // streaming AST can't be reified because it contains a function
            this.mode !== "stream" &&
            // all children need to be static
            isStaticChildren &&
            // all attributes must be literal
            isStaticAttributes &&
            // tag must not be dynamic
            !isDynamicTag;

        let staticAttributes: Attributes<AttributeValue> | null;
        if (isStaticAttributes)
            staticAttributes = mapObject(attributes, value => (value as ESTree.Literal).value as AttributeValue);

        if (isStatic) {
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
        // static AST computation would already throw if void rule is violated, so we only have to check at this point
        // note that we disallow any children if they turn out to be empty
        // e.g. <br>{null}</br> is not admissible because it is nonsensical
        // if the tag is dynamic, we need to perform the check at runtime

        const isVoid = isVoidElement(tag);
        if (!isDynamicTag && isVoid && children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);

        const normalizedChildren = this.normalizeChildren(isStaticChildren, children);

        let tagIdentifier: ESTree.Expression;
        if (isDynamicTag)
            tagIdentifier = Operations.identifier(tag.substring(1));
        else
            tagIdentifier = Reify.string(tag);

        let tagOpen: ESTree.Expression;
        if (isDynamicTag)
            tagOpen = Operations.binaryPlus(Reify.string("<"), tagIdentifier);
        else
            tagOpen = Reify.string("<" + tag);

        let tagClose: ESTree.Expression;
        if (isDynamicTag)
            tagClose = Operations.binaryPlus(Reify.string("</"), Operations.binaryPlus(tagIdentifier, Reify.string(">")));
        else
            tagClose = Reify.string(`</${tag}>`);

        if (this.mode === "structured") {
            // we could put a runtime check here, but this will throw an error at some point during rendering
            return Reify.object({
                astType: Reify.string("structured"),
                nodeType: Reify.string("element"),
                tag: tagIdentifier,
                attributes: Reify.object(attributes),
                children: normalizedChildren
            });
        }
        else if (this.mode === "stream") {
            const [buffer, bufferWrite] = this.bufferGenWrite();

            const render: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [Operations.identifier("x")],
                body: Operations.call(
                    Operations.member(Operations.identifier("x"), Operations.identifier("render")),
                    buffer
                )
            };

            const bodyOpen = [
                bufferWrite(tagOpen),
                // TODO escaping attributes needs to take false/true/null/undefined into account
                ..._.flatMap(Object.entries(attributes), attribute => {
                    const[key, value] = attribute;
                    return [
                        bufferWrite(Reify.string(` ${key}="`)),
                        bufferWrite(this.runtime.escapeHTML(value)),
                        bufferWrite(Reify.string('"'))
                    ]
                }),
                bufferWrite(Reify.string(">"))
            ].map(Operations.expressionStatement);

            const regularBodyClose = [
                Reify.esarray(normalizedChildren).forEach(render),
                bufferWrite(tagClose)
            ].map(Operations.expressionStatement);
            let bodyClose: ESTree.Statement[];
            if (isVoid)
                bodyClose = [];
            else if (!isDynamicTag)
                bodyClose = regularBodyClose;
            else
                // TODO runtime check: void && children > 0
                bodyClose = [{
                    type: "IfStatement",
                    test: this.runtime.isVoidElement(tagIdentifier),
                    consequent: Operations.block(),
                    alternate: Operations.block(...regularBodyClose)
                }];

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
            const selector: ESTree.ArrowFunctionExpression = {
                type: "ArrowFunctionExpression",
                expression: true,
                params: [Operations.identifier("x")],
                body: Operations.member(Operations.identifier("x"), Operations.identifier("value"))
            };
            const children = Reify.esarray(normalizedChildren).map(selector);

            const partsOpen = [
                tagOpen,
                // TODO escaping attributes needs to take false/true/null/undefined into account
                ...Object.entries(attributes).map(attribute => {
                    const [key, value] = attribute;
                    return Operations.binaryPlus(
                        Reify.string(` ${key}="`),
                        Operations.binaryPlus(this.runtime.escapeHTML(value), Reify.string('"'))
                    );
                }),
                Reify.string(">"),
            ];

            let partsClosed: (ESTree.Expression | ESTree.SpreadElement)[];
            if (isVoid)
                partsClosed = [];
            else if (!isDynamicTag)
                partsClosed = [Reify.esarray(children).spread(), tagClose];
            else
                // TODO runtime check: void && children > 0
                partsClosed = [
                    Reify.esarray({
                        type: "ConditionalExpression",
                        test: this.runtime.isVoidElement(tagIdentifier),
                        consequent: Reify.array([]),
                        alternate: children
                    }).spread(),
                    tagClose
                ];

            return Reify.object({
                astType: Reify.string("raw"),
                value: Reify.esarray(Reify.array([...partsOpen, ...partsClosed])).join()
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

        return Operations.call(macro, Reify.object(attributes), Reify.esarray(normalizedChildren).spread());
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

export function parse(js: string): ESTree.Node {
    return acorn.parse(js) as any as ESTree.Node; // TODO dodgy: version mismatch??
}

export function preprocess(ast: ESTree.Node, builder: ESTreeBuilder): ESTree.Program {
    const compiled = walk(ast, {
        enter(node, parent, prop, index) {
        },
        leave(node, parent, prop, index) {
            // @ts-ignore
            if (node.type === "JSXElement") {
                const element = node as any as JSXElement;
                const tag = element.openingElement.name.name;
                const attributes = Object.fromEntries(
                    element.openingElement.attributes.map(attr =>
                        [attr.name.name, attr.value as ESTree.Expression]
                    )
                );
                const children = element.children as ESTree.Expression[];
                const replacement =
                    isMacro(tag) ?
                        builder.macro(Operations.identifier(tag), attributes, ...children) :
                        builder.element(tag, attributes, ...children);
                this.replace(replacement);
            }
            // @ts-ignore
            else if (node.type === "JSXExpressionContainer") {
                const container = node as any as JSXExpressionContainer;
                this.replace(container.expression);
            }
            // @ts-ignore
            else if (node.type === "JSXFragment") {
                const fragment = node as any as JSXFragment;
                const children = fragment.children as ESTree.Expression[];
                this.replace(builder.macro(builder.runtime.fragment, {}, ...children))
            }
            // @ts-ignore
            else if (node.type === "JSXText") {
                const text = node as any as JSXText;
                this.replace(builder.text(text.value));
            }
        }
    });
    return compiled as ESTree.Program;
}