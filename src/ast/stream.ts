import * as Base from "./base";
import {Attributes, escapeHTML, isVoidElement, renderAttributes} from "../jsx/syntax";
import {Builder, defaultTagCheck} from "./builder";

export interface Buffer {
    write(content: string): void;
}

export class StringBuffer implements Buffer {
    private buffer = "";

    write(content: string): void {
        this.buffer += content;
    }

    get content(): string {
        return this.buffer;
    }
}

export interface AST extends Base.AST {
    readonly astKind: "stream";
    readonly isElement: boolean;
    readonly _extraChildren?: AST[];
    readonly _extraAttributes?: Attributes;
    render(buffer: Buffer): void;
}

export type Modifier<T> = (t?: T) => T | undefined

function childrenAdder(children: AST[]): Modifier<AST[]> {
    if (children.length === 0)
        return children => children;
    else
        return oldChildren => {
            if (oldChildren === undefined)
                oldChildren = [];
            return [...oldChildren, ...children];
        };
}

function attributeAdder(attributes: Attributes): Modifier<Attributes> {
    return oldAttributes => ({... oldAttributes, ...attributes});
}

export function _clone(
    ast: AST,
    childrenFn: Modifier<AST[]>,
    attrFn: Modifier<Attributes>
): AST {
    if (!ast.isElement)
        throw new Error("Cannot extend non-element with extra children nor extra attributes");

    return {
        ...ast,
        _extraChildren: childrenFn(ast._extraChildren),
        _extraAttributes: attrFn(ast._extraAttributes)
    };
}

function create(fn: (buffer: Buffer) => void): AST {
    return {
        astKind: "stream",
        isElement: false,
        render: fn
    };
}

export class ASTBuilder<P> extends Builder<AST, P> {
    constructor(
        private readonly renderP: (p: P) => ((buffer: Buffer) => void)
    ) { super(); }

    element(tag: string, attributes?: Attributes, ...children: AST[]): AST {
        defaultTagCheck(tag, children);

        return {
            astKind: "stream",
            isElement: true,

            render(buffer: Buffer): void {
                buffer.write("<");
                buffer.write(tag);

                const allAttributes = {...attributes, ...this._extraAttributes};
                buffer.write(renderAttributes(allAttributes));
                buffer.write(">");

                const extraChildren: AST[] = this._extraChildren ? this._extraChildren : [];
                if (isVoidElement(tag)) {
                    if (extraChildren.length > 0)
                        throw new Error(`Void element ${tag} must not have extra children`);
                }
                else {
                    children.forEach(child => child.render(buffer));
                    extraChildren.forEach(child => child.render(buffer));
                    buffer.write("</");
                    buffer.write(tag);
                    buffer.write(">");
                }
            }
        };
    }

    prerendered(p: P): AST {
        return create(buffer => this.renderP(p)(buffer));
    }

    text(text: string): AST {
        return create(buffer => buffer.write(escapeHTML(text)));
    }
}

export function force(ast: AST): string {
    const buffer = new StringBuffer();
    ast.render(buffer);
    return buffer.content;
}

export const info: () => Base.ASTInfo<AST, string> = () => ({
    astKind: "stream",
    builder: new ASTBuilder(p => buffer => buffer.write(p)),
    introspection: {
        addItems(ast: AST, attributes: Attributes, children: AST[]): AST {
            return _clone(
                ast,
                childrenAdder(children),
                attributeAdder(attributes)
            );
        }
    },
    force: force,
    asString: string => string
});
