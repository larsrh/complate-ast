import * as ESTree from "estree";
import * as Operations from "./operations";
import {ArrayExpr} from "./expr";

export function string(s: string): ESTree.SimpleLiteral {
    return {
        type: "Literal",
        value: s
    };
}

export function array(items: (ESTree.Expression | ESTree.SpreadElement)[]): ArrayExpr {
    return new ArrayExpr({
        type: "ArrayExpression",
        elements: items
    });
}

export function number(i: number): ESTree.SimpleLiteral {
    return {
        type: "Literal",
        value: i
    };
}

export function boolean(b: boolean): ESTree.SimpleLiteral {
    return {
        type: "Literal",
        value: b
    };
}

export function object(fields: Record<string, ESTree.Expression>): ESTree.ObjectExpression {
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
    return Operations.object(...props);
}

export function any(x: any): ESTree.Expression {
    if (x === null)
        return {
            type: "Literal",
            value: null
        };

    if (x === undefined)
        return {
            type: "UnaryExpression",
            operator: "void",
            prefix: true,
            argument: {
                type: "Literal",
                value: 0
            }
        };

    if (typeof x === "boolean")
        return boolean(x);

    if (typeof x === "number")
        return number(x);

    if (typeof x === "string")
        return string(x);

    if (Array.isArray(x)) {
        const a = x as any[];
        return array(a.map(item => any(item))).raw;
    }

    if (typeof x === "object") {
        const map = Object.fromEntries(Object.entries(x).map(entry => {
            const [key, value] = entry;
            return [key, any(value)];
        }));
        return object(map);
    }

    if (typeof x === "function")
        throw new Error("Functions can't be reified");

    throw new Error("Unknown value");
}
