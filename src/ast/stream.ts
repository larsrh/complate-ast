import {Stream} from "../stream";
import {Attributes, AttributeValue, Builder} from "./builder";
import * as Universal from "./universal";
import {escapeHTML} from "../jsx/syntax";

export interface AST extends Universal.AST {
    readonly astType: "stream"
    render(stream: Stream): void
}

export function create(fn: (stream: Stream) => void): AST {
    return {
        astType: "stream",
        render: fn
    };
}

export class ASTBuilder<P> implements Builder<AST, P> {
    constructor(
        private readonly renderP: (p: P) => ((stream: Stream) => void)
    ) {
    }

    element(tag: string, attributes?: Attributes, ...children: AST[]): AST {
        return create(stream => {
            stream.add("<");
            stream.add(tag);
            if (attributes)
                for (const [key, value] of Object.entries(attributes))
                    if (value !== null) {
                        stream.add(" ");
                        stream.add(key);
                        stream.add("=\"");
                        stream.add(escapeHTML(value));
                        stream.add("\"");
                    }
            stream.add(">");
            children.forEach(child => child.render(stream));
            stream.add("</");
            stream.add(tag);
            stream.add(">");
        });
    }

    prerendered(p: P): AST {
        return create(stream => {
            this.renderP(p)(stream);
        });
    }

    text(text: string): AST {
        return create(stream => {
            stream.add(escapeHTML(text))
        });
    }

    attributeValue(value: AttributeValue): AttributeValue {
        return value;
    }
}

export const astBuilder = new ASTBuilder<string>(x => stream => stream.add(x));
export const astBuilderNoPrerender = new ASTBuilder<never>(x => stream => {});