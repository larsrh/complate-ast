import * as ESTree from "estree";

export function object(fields: Map<string, ESTree.Expression>): ESTree.ObjectExpression {
    const props = [...fields.entries()].map(field => {
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

export function array(items: ESTree.Expression[]): ESTree.ArrayExpression {
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
        const map = new Map(Object.entries(o).map(entry => {
            const [key, value] = entry;
            return [key, any(value)];
        }));
        return object(map);
    }

    throw new Error("Unknown value");
}