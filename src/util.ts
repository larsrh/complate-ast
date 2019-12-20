export type Object<V> = { [key: string]: V }

export function mapObject<V, W>(object: Object<V>, fn: (v: V) => W): Object<W> {
    return Object.fromEntries(Object.entries(object).map(entry => {
        const [key, value] = entry;
        return [key, fn(value)]
    }));
}
