export function objectFromEntries<T = any>(entries: [string, T][]): { [k: string]: T } {
    const object = {};
    for (const [key, value] of entries)
        object[key] = value;
    return object;
}

export function mapObject<V, W>(object: Record<string, V>, fn: (v: V) => W): Record<string, W> {
    return objectFromEntries(Object.entries(object).map(entry => {
        const [key, value] = entry;
        return [key, fn(value)]
    }));
}

export function filterObject<V>(object: Record<string, V | null>): Record<string, V> {
    const newObject: Record<string, V> = {};
    for (const [key, value] of Object.entries(object))
        if (value !== null)
            newObject[key] = value;
    return newObject;
}

export function every<T, U>(array: T[], fn: (t: T) => U | false): U[] | false {
    const result: U[] = [];
    for (const item of array) {
        const u = fn(item);
        if (u === false)
            return false;
        result.push(u);
    }
    return result;
}

export function defaultTo<T>(value: T | null | undefined, defaultValue: T): T {
    if (value === null || value === undefined)
        return defaultValue;
    else
        return value;
}