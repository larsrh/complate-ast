import {Builder} from "./builder";

export interface AST {
    readonly astType: string;
}

export interface ASTInfo<T extends AST> {
    readonly astType: string;
    readonly builder: Builder<T>;
}