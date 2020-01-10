export function mapObject<V, W>(object: Record<string, V>, fn: (v: V) => W): Record<string, W> {
    return Object.fromEntries(Object.entries(object).map(entry => {
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
