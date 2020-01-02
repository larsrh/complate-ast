import * as Universal from "./universal";
import * as Structured from "./structured";
import * as Raw from "./raw";
import * as Stream from "./stream";
import {Attributes} from "../jsx/syntax";
import {normalizeChildren} from "./builder";

export const allKinds: Set<Universal.Kind> = new Set(["structured", "stream", "raw"]);

export function isAST(object: any): object is Universal.AST {
    return object.astType && allKinds.has(object.astType);
}

export function isStructured(ast: Universal.AST): ast is Structured.AST<any> {
    return ast.astType === "structured";
}

export function isStream(ast: Universal.AST): ast is Stream.AST {
    return ast.astType === "stream";
}

export function isRaw(ast: Universal.AST): ast is Raw.AST {
    return ast.astType === "raw";
}

function streamChildrenAdder(children: Stream.AST[]): Stream.Modifier<Stream.AST[]> {
    if (children.length === 0)
        return children => children;
    else
        return oldChildren => {
            if (oldChildren === undefined)
                oldChildren = [];
            return [...oldChildren, ...children as Stream.AST[]];
        };
}

function streamAttributeAdder(attributes?: Attributes): Stream.Modifier<Attributes> {
    if (attributes === undefined)
        return attrs => attrs;
    else
        return oldAttributes => ({... oldAttributes, ...attributes});
}

export function addItems<AST extends Universal.AST>(ast: AST, attributes?: Attributes, ..._children: any[]): AST {
    const children = normalizeChildren(ast.astType, ..._children);

    if (isStructured(ast)) {
        if (Structured.isElement(ast)) {
            const newChildren = [...ast.children, ...children as Structured.AST<any>[]];
            const newAttributes = {...ast.attributes, ...attributes};
            return new Structured.ElementNode(ast.tag, newAttributes, newChildren) as any as AST;
        }

        // TODO look into prerendered?

        throw new Error(`Supplied node is ${ast.nodeType} and has no children`);
    }
    else if (isStream(ast)) {
        return Stream._clone(
            ast,
            streamChildrenAdder(children as Stream.AST[]),
            streamAttributeAdder(attributes)
        ) as any as AST;
    }

    throw new Error(`Cannot modify children of AST kind ${ast.astType}`);
}
