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

