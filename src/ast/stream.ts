import {Attributes, AttributeValue, Builder} from "./builder";
import * as Universal from "./universal";
import {escapeHTML} from "../jsx/syntax";

export interface Buffer {
    write(content: string): void
}

export class StringBuffer implements Buffer {
    private buffer: string = "";

    write(content: string): void {
        this.buffer += content;
    }

    get content(): string {
        return this.buffer;
    }
}

export interface AST extends Universal.AST {
    readonly astType: "stream"
    render(buffer: Buffer): void
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
        return create(buffer => {
            buffer.write("<");
            buffer.write(tag);
            if (attributes)
                for (const [key, value] of Object.entries(attributes))
                    if (value !== null) {
                        buffer.write(" ");
                        buffer.write(key);
                        buffer.write("=\"");
                        buffer.write(escapeHTML(value));
                        buffer.write("\"");
                    }
            buffer.write(">");
            children.forEach(child => child.render(buffer));
            buffer.write("</");
            buffer.write(tag);
            buffer.write(">");
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

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export const astBuilder = new ASTBuilder<string>(x => buffer => buffer.write(x));
export const astBuilderNoPrerender = new ASTBuilder<never>(x => buffer => {});