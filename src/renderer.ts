export interface Renderer<P, O> {
    renderPrerendered(p: P): O
    renderText(text: string): O
    renderElement(tag: string, attributes: object, children: O[]): O
}
