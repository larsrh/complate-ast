import * as ESTree from "estree";

export function binaryPlus(left: ESTree.Expression, ...rights: ESTree.Expression[]): ESTree.Expression {
    let result = left;
    for (const right of rights)
        result = {
            type: "BinaryExpression",
            operator: "+",
            left: result,
            right: right
        };
    return result;
}

export function notEqual(left: ESTree.Expression, right: ESTree.Expression): ESTree.BinaryExpression {
    return {
        type: "BinaryExpression",
        operator: "!==",
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

export function ifthenelse(test: ESTree.Expression, consequent: ESTree.Statement, alternate?: ESTree.Statement): ESTree.IfStatement {
    return {
        type: "IfStatement",
        test: test,
        consequent: consequent,
        alternate: alternate
    };
}

export function conditional(test: ESTree.Expression, consequent: ESTree.Expression, alternate: ESTree.Expression): ESTree.ConditionalExpression {
    return {
        type: "ConditionalExpression",
        test: test,
        consequent: consequent,
        alternate: alternate
    };
}

export function ret(value: ESTree.Expression): ESTree.ReturnStatement {
    return {
        type: "ReturnStatement",
        argument: value
    };
}