import {Renderer} from "../renderer";

// TODO use import ... from
const escapeHtml = require("escape-html");

export interface Stream {
    add(content: string): void
}

export class StringStream implements Stream {
    private buffer: string = "";

    add(content: string): void {
        this.buffer += content;
    }

    get content(): string {
        return this.buffer;
    }
}

export class StreamRenderer implements Renderer<string, () => void> {
    constructor(
        private readonly stream: Stream
    ) {}

    renderElement(tag: string, attributes: Map<string, string>, children: (() => void)[]): () => void {
        return () => {
            this.stream.add("<");
            this.stream.add(tag);
            for (const [key, value] of attributes.entries()) {
                this.stream.add(" ");
                this.stream.add(key);
                this.stream.add("='");
                this.stream.add(escapeHtml(value));
                this.stream.add("'");
            }
            this.stream.add(">");
            children.forEach(child => child());
            this.stream.add("</");
            this.stream.add(tag);
            this.stream.add(">");
        }
    }

    renderPrerendered(p: string): () => void {
        return () => this.stream.add(p);
    }

    renderText(text: string): () => void {
        return () => this.stream.add(escapeHtml(text));
    }
}
