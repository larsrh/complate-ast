export interface Stream {
    write(content: string): void
}

export class StringStream implements Stream {
    private buffer: string = "";

    write(content: string): void {
        this.buffer += content;
    }

    get content(): string {
        return this.buffer;
    }
}

