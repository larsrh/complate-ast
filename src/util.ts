export type Object<V> = { [key: string]: V }

export function mapObject<V, W>(object: Object<V>, fn: (v: V, key: string) => W): Object<W> {
    return Object.fromEntries(Object.entries(object).map(entry => {
        const [key, value] = entry;
        return [key, fn(value, key)]
    }));
}

export function filterObject<V>(object: Object<V | null>): Object<V> {
    let newObject: Object<V> = {};
    for (const [key, value] of Object.entries(object))
        if (value !== null)
            newObject[key] = value;
    return newObject;
}