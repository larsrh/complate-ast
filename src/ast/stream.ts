import {Builder} from "./builder";
import * as Universal from "./universal";
import {
    Attributes,
    AttributeValue,
    escapeHTML,
    isMacro,
    isVoidElement,
    normalizeAttributes
} from "../jsx/syntax";

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
    render(buffer: Buffer): void;
}

export function create(fn: (buffer: Buffer) => void): AST {
    return {
        astType: "stream",
        render: fn
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

        return create(buffer => {
            buffer.write("<");
            buffer.write(tag);
            for (const [key, value] of Object.entries(normalizeAttributes(true, attributes))) {
                buffer.write(" ");
                buffer.write(key);
                buffer.write("=\"");
                buffer.write(value);
                buffer.write("\"");
            }
            buffer.write(">");
            if (!isVoid) {
                children.forEach(child => child.render(buffer));
                buffer.write("</");
                buffer.write(tag);
                buffer.write(">");
            }
        });
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