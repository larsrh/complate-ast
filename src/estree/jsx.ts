import * as ESTree from "estree";

export interface JSXText extends ESTree.BaseNode {
    readonly type: "JSXText";
    readonly value: string;
}

export interface JSXIdentifier extends ESTree.BaseNode {
    readonly type: "JSXIdentifier";
    readonly name: string;
}

export interface JSXExpressionContainer extends ESTree.BaseNode {
    readonly type: "JSXExpressionContainer";
    readonly expression: ESTree.BaseExpression;
}

export interface JSXAttribute extends ESTree.BaseNode {
    readonly type: "JSXAttribute";
    readonly name: JSXIdentifier;
    readonly value: ESTree.BaseExpression;
}

export interface JSXOpeningElement extends ESTree.BaseNode {
    readonly type: "JSXOpeningElement";
    readonly name: JSXIdentifier;
    readonly attributes: JSXAttribute[];
    readonly selfClosing: boolean;
}

export interface JSXClosingElement extends ESTree.BaseNode {
    readonly type: "JSXClosingElement";
    readonly name: JSXIdentifier;
}

export interface JSXElement extends ESTree.BaseNode {
    readonly type: "JSXElement";
    readonly openingElement: JSXOpeningElement;
    readonly closingElement: JSXClosingElement | null; // null if openingElement.selfClosing
    readonly children: ESTree.BaseExpression[];
}

export interface JSXFragment extends ESTree.BaseNode {
    readonly type: "JSXFragment";
    readonly children: ESTree.BaseExpression[];
}