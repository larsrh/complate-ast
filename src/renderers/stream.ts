import {Renderer} from "../renderer";

export interface Stream {
    add(content: string): void
}

export class StreamRenderer implements Renderer<string, void> {
    constructor(
        private readonly stream: Stream
    ) {}

    renderElement(tag: string, attributes: Map<string, string>, children: void[]): void {
    }

    renderPrerendered(p: string): void {
        this.stream.add(p);
    }

    renderText(text: string): void {
    }
}
