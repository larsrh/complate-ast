import {Builder} from "./builder";
import {Attributes} from "../syntax/util";

export interface AST {
    readonly astKind: string;
}

export interface Introspection<T extends AST> {
    addItems(ast: T, attributes: Attributes, children: T[]): T;
}

export interface ASTInfo<T extends AST, Forced = T> {
    readonly astKind: string;
    readonly builder: Builder<T, string>;
    readonly introspection?: Introspection<T>;
    force(t: T): Forced;
    asString(forced: Forced): string;
}
