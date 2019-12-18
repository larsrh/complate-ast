export type Kind = "raw" | "stream" | "structured"

export interface AST {
    readonly astType: Kind
}