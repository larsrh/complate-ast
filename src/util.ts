export function mapValues<K, V, W>(map: Map<K, V>, fn: (v: V) => W): Map<K, W> {
    return new Map<K, W>([...map.entries()].map(entry => {
        const [key, value] = entry;
        return [key, fn(value)];
    }))
}