import * as ESTree from "estree";
import {Object} from "../util";
import {call, identifier, member} from "./operations";

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

// TODO implements SpreadElement
export class ESArray {
    constructor(
        private readonly array: ESTree.Expression
    ) {}

    join(): ESTree.CallExpression {
        return call(member(this.array, identifier("join")), string(""));
    }

    map(fn: ESTree.Expression): ESTree.CallExpression {
        return call(member(this.array, identifier("map")), fn);
    }

    forEach(fn: ESTree.Expression): ESTree.CallExpression {
        return call(member(this.array, identifier("forEach")), fn);
    }

    spread(): ESTree.SpreadElement {
        return {
            type: "SpreadElement",
            argument: this.array
        }
    }
}

export function esarray(tree: ESTree.Expression): ESArray {
    return new ESArray(tree);
}
