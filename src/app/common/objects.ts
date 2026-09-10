/**
 * Deep clone — full TypeScript version
 * Supports circular refs, Date, RegExp, arrays, and plain objects
 * @param target Value to clone
 * @param cache Circular-reference cache
 * @returns A deep copy of the original data
 */
export function deepClone<T>(target: T, cache = new WeakMap<object, unknown>()): T {
    // Return primitives as-is
    if (target === null || typeof target !== 'object') {
        return target;
    }

    // Handle circular references
    if (cache.has(target)) {
        return cache.get(target) as T;
    }

    // Date
    if (target instanceof Date) {
        const copy = new Date(target);
        cache.set(target, copy);
        return copy as unknown as T;
    }

    // RegExp
    if (target instanceof RegExp) {
        const copy = new RegExp(target.source, target.flags);
        cache.set(target, copy);
        return copy as unknown as T;
    }

    // Array / plain object
    const cloneTarget = Array.isArray(target) ? [] : {};
    cache.set(target, cloneTarget);

    // Walk own properties (including symbol keys)
    Reflect.ownKeys(target).forEach((key) => {
        (cloneTarget as Record<string | symbol, unknown>)[key] = deepClone(
            (target as Record<string | symbol, unknown>)[key],
            cache
        );
    });

    return cloneTarget as T;
}

// ============ Usage example ============
// interface User {
//     name: string;
//     time: Date;
//     tags: number[];
// }

// const source: User = {
//     name: "demo",
//     time: new Date(),
//     tags: [11, 22, { id: 99 }]
// };

// const copy = deepClone(source);
// console.log(copy);