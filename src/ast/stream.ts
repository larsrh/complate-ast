import {Builder} from "./builder";
import * as Universal from "./universal";
import {Attributes, AttributeValue, escapeHTML, isMacro, isVoidElement, normalizeAttributes} from "../jsx/syntax";
import _ from "lodash";

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

export interface AST extends Universal.AST {
    readonly astType: "stream";
    readonly _extraChildren?: AST[];
    readonly _extraAttributes?: Attributes;
    render(buffer: Buffer): void;
}

export type Modifier<T> = (t?: T) => T | undefined

export function _clone(
    ast: AST,
    childrenFn: Modifier<AST[]>,
    attrFn: Modifier<Attributes>
): AST {
    // The original AST is cloned (using lodash to also clone the methods, Object.assign doesn't work here)
    // in  a second step, we use Object.assign to overwrite the children and attributes
    // no binding required, since the ASTs are always called on the proper `this` argument
    const newAST = _.clone(ast);
    Object.assign(newAST, {
        _extraChildren: childrenFn(ast._extraChildren),
        _extraAttributes: attrFn(ast._extraAttributes)
    });
    return newAST;
}

abstract class RuntimeASTImpl implements AST {
    readonly astType = "stream";
    readonly _extraChildren: AST[] | undefined = undefined;
    readonly _extraAttributes: Attributes | undefined = undefined;
    abstract readonly isElement: boolean;

    render(buffer: Buffer): void {
        const hasExtraChildren =
            this._extraChildren !== undefined && this._extraChildren.length > 0;
        const hasExtraAttributes =
            this._extraAttributes !== undefined && Object.keys(this._extraAttributes).length > 0;
        if (!this.isElement && (hasExtraChildren || hasExtraAttributes))
            throw new Error("Cannot extend non-element with extra children nor extra attributes");

        this._render(buffer);
    }

    abstract _render(buffer: Buffer): void;
}

export function create(fn: (buffer: Buffer) => void): AST {
    return new class extends RuntimeASTImpl {
        readonly isElement = false;
        _render(buffer: Buffer): void {
            fn(buffer);
        }
    };
}

export class ASTBuilder<P> implements Builder<AST, P> {
    constructor(
        private readonly renderP: (p: P) => ((buffer: Buffer) => void)
    ) {
    }

    element(tag: string, attributes?: Attributes, ...children: AST[]): AST {
        const isVoid = isVoidElement(tag);
        if (isVoid && children.length > 0)
            throw new Error(`Void element ${tag} must not have children`);
        if (isMacro(tag))
            throw new Error(`Macro tag ${tag} not allowed in an AST`);

        return new class extends RuntimeASTImpl {
            readonly isElement = true;

            _render(buffer: Buffer): void {
                buffer.write("<");
                buffer.write(tag);

                const allAttributes = {...attributes, ...this._extraAttributes};
                for (const [key, value] of Object.entries(normalizeAttributes(true, allAttributes))) {
                    buffer.write(" ");
                    buffer.write(key);
                    buffer.write("=\"");
                    buffer.write(value);
                    buffer.write("\"");
                }
                buffer.write(">");

                const extraChildren: AST[] = this._extraChildren ? this._extraChildren : [];
                if (isVoid) {
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
        return create(buffer => {
            this.renderP(p)(buffer);
        });
    }

    text(text: string): AST {
        return create(buffer => {
            buffer.write(escapeHTML(text))
        });
    }

    attributeValue(key: string, value: AttributeValue): AttributeValue {
        return value;
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const astBuilder = new ASTBuilder<string>(x => buffer => buffer.write(x));
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const astBuilderNoPrerender = new ASTBuilder<never>(() => () => {/* do nothing */});

export function force(ast: AST): string {
    const buffer = new StringBuffer();
    ast.render(buffer);
    return buffer.content;
}
