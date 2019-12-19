import {Builder as B} from "./builder";

export type Kind = "raw" | "stream" | "structured"

export interface AST {
    readonly astType: Kind
}

export type Builder = B<AST>;