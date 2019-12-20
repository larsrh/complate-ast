import * as ESTree from "estree";
import {Object} from "../util";

export function object(fields: Object<ESTree.Expression>): ESTree.ObjectExpression {
    const props = Object.entries(fields).map(field => {
        const [key, value] = field;
        const prop: ESTree.Property = {
            type: "Property",
            key: string(key),
            kind: "init",
            computed: false,
            method: false,
            shorthand: false,
            value: value
        };
        return prop;
    });
    return {
        type: "ObjectExpression",
        properties: props
    };
}

export function array(items: (ESTree.Expression | ESTree.SpreadElement)[]): ESTree.ArrayExpression {
    return {
        type: "ArrayExpression",
        elements: items
    };
}

export function string(s: string): ESTree.SimpleLiteral {
    return {
        type: "Literal",
        value: s
    }
}

export function number(i: number): ESTree.SimpleLiteral {
    return {
        type: "Literal",
        value: i
    }
}

export function any(x: any): ESTree.Expression {
    if (typeof x === "number")
        return number(x as number);

    if (typeof x === "string")
        return string(x as string);

    if (Array.isArray(x)) {
        const a = x as any[];
        return array(a.map(item => any(item)));
    }

    if (typeof x === "object") {
        const o = x as object;
        const map = Object.fromEntries(Object.entries(o).map(entry => {
            const [key, value] = entry;
            return [key, any(value)];
        }));
        return object(map);
    }

    if (typeof x === "function") {
        throw new Error("Functions can't be reified");
    }

    throw new Error("Unknown value");
}

export namespace functions {

    export function arrayJoin(array: ESTree.Expression): ESTree.CallExpression {
        return {
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: array,
                property: {
                    type: "Identifier",
                    name: "join"
                },
                computed: false
            },
            arguments: [string("")]
        }
    }

    export function arrayMap(array: ESTree.Expression, fn: ESTree.Expression): ESTree.CallExpression {
        return {
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: array,
                property: {
                    type: "Identifier",
                    name: "map"
                },
                computed: false
            },
            arguments: [fn]
        }
    }

    export function arrayForEach(array: ESTree.Expression, fn: ESTree.Expression): ESTree.CallExpression {
        return {
            type: "CallExpression",
            callee: {
                type: "MemberExpression",
                object: array,
                property: {
                    type: "Identifier",
                    name: "forEach"
                },
                computed: false
            },
            arguments: [fn]
        }
    }

    export function binaryPlus(left: ESTree.Expression, right: ESTree.Expression): ESTree.BinaryExpression {
        return {
            type: "BinaryExpression",
            operator: "+",
            left: left,
            right: right
        };
    }

}