import * as ESTree from "estree";

// TODO n-ary
export function binaryPlus(left: ESTree.Expression, right: ESTree.Expression): ESTree.BinaryExpression {
    return {
        type: "BinaryExpression",
        operator: "+",
        left: left,
        right: right
    };
}

export function call(callee: ESTree.Expression, ...args: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.CallExpression {
    return {
        type: "CallExpression",
        callee: callee,
        arguments: args
    };
}

export function member(object: ESTree.Expression, property: ESTree.Identifier): ESTree.MemberExpression {
    return {
        type: "MemberExpression",
        object: object,
        property: property,
        computed: false
    };
}

export function identifier(name: string): ESTree.Identifier {
    return {
        type: "Identifier",
        name: name
    };
}

export function expressionStatement(expr: ESTree.Expression): ESTree.ExpressionStatement {
    return {
        type: "ExpressionStatement",
        expression: expr
    };
}

export function block(...statements: ESTree.Statement[]): ESTree.BlockStatement {
    return {
        type: "BlockStatement",
        body: statements
    };
}

export function iife(...statements: ESTree.Statement[]): ESTree.CallExpression {
    return call({
        type: "ArrowFunctionExpression",
        expression: false,
        params: [],
        body: {
            type: "BlockStatement",
            body: statements
        }
    });
}