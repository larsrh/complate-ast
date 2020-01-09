import {Builder} from "./builder";

export interface AST {
    readonly astType: string;
}

export interface ASTInfo<T extends AST, Forced = T> {
    readonly astType: string;
    readonly builder: Builder<T>;
    force(t: T): Forced;
    asString(forced: Forced): string;
}