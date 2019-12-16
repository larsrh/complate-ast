export interface Builder<A, P = never> {
    text(text: string): A
    prerendered(p: P): A
    element(tag: string, attributes?: object, ...children: A[]): A
}
