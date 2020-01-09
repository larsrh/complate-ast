import {Builder} from "./builder";
import {Attributes} from "../jsx/syntax";

export interface AST {
    readonly astType: string;
}

export interface Introspection<T extends AST> {
    addItems(ast: T, attributes: Attributes, children: T[]): T;
}

export interface ASTInfo<T extends AST, Forced = T> {
    readonly astType: string;
    readonly builder: Builder<T>;
    readonly introspection?: Introspection<T>;
    force(t: T): Forced;
    asString(forced: Forced): string;
}