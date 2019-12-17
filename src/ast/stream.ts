import {Stream} from "../stream";
import {Builder} from "./builder";

// TODO use import ... from
const escapeHtml = require("escape-html");

export interface StreamAST {
    readonly astType: "stream"
    render(stream: Stream): void
}

export function createStreamAST(fn: (stream: Stream) => void): StreamAST {
    return {
        astType: "stream",
        render: fn
    };
}

export class StreamBuilder<P> implements Builder<StreamAST, P> {
    constructor(
        private readonly renderP: (p: P) => string
    ) {
    }

    element(tag: string, attributes?: object, ...children: StreamAST[]): StreamAST {
        return createStreamAST(stream => {
            stream.add("<");
            stream.add(tag);
            if (attributes)
                for (const [key, value] of Object.entries(attributes)) {
                    stream.add(" ");
                    stream.add(key);
                    stream.add("=\"");
                    stream.add(escapeHtml(value));
                    stream.add("\"");
                }
            stream.add(">");
            children.forEach(child => child.render(stream));
            stream.add("</");
            stream.add(tag);
            stream.add(">");
        });
    }

    prerendered(p: P): StreamAST {
        return createStreamAST(stream => {
            stream.add(this.renderP(p));
        });
    }

    text(text: string): StreamAST {
        return createStreamAST(stream => {
            stream.add(escapeHtml(text))
        });
    }

}

export const streamBuilder = new StreamBuilder<string>(x => x);
export const streamBuilderNoPrerender = new StreamBuilder<never>(x => "");