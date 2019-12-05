export interface Renderer<P, O> {
    renderPrerendered(p: P): O
    renderText(text: string): O
    renderElement(tag: string, attributes: Map<string, string>, children: O[]): O
}
