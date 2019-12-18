import * as ESTree from "estree";

export interface JSXNode extends ESTree.BaseNode {
    readonly type: string;
}

export interface JSXExpression extends ESTree.BaseExpression, JSXNode {
    readonly type: string;
}

export interface JSXText extends JSXExpression {
    readonly type: "JSXText";
    readonly value: string;
}

export interface JSXIdentifier extends JSXNode {
    readonly type: "JSXIdentifier";
    readonly name: string;
}

export interface JSXExpressionContainer extends JSXNode {
    readonly type: "JSXExpressionContainer";
    readonly expression: ESTree.Expression;
}

export interface JSXAttribute extends JSXNode {
    readonly type: "JSXAttribute";
    readonly name: JSXIdentifier;
    readonly value: JSXExpression | ESTree.Literal;
}

export interface JSXOpeningElement extends JSXNode {
    readonly type: "JSXOpeningElement";
    readonly name: JSXIdentifier;
    readonly attributes: JSXAttribute[];
    readonly selfClosing: boolean;
}

export interface JSXClosingElement extends JSXNode {
    readonly type: "JSXClosingElement";
    readonly name: JSXIdentifier;
}

export interface JSXElement extends JSXExpression {
    readonly name: "JSXElement";
    readonly openingElement: JSXOpeningElement;
    readonly closingElement: JSXClosingElement | null; // null if openingElement.selfClosing
    readonly children: ESTree.BaseExpression[];
}