// eslint-disable-next-line import/prefer-default-export
export function mergeItems<T, K extends string>(
    list: T[],
    keySelector: (item: T) => K,
    merge: (prev: T, item: T, key: K) => T,
): T[] {
    const mapping: {
        [key: string]: T | undefined;
    } = {};
    list.forEach((item) => {
        const key = keySelector(item);
        const prev = mapping[key];
        if (!prev) {
            mapping[key] = prev;
        } else {
            mapping[key] = merge(prev, item, key);
        }
    });
    return Object.values(list);
}

export function max<T>(list: T[], comparator: (val: T) => number) {
    if (list.length <= 0) {
        return undefined;
    }
    let maxItem = list[0];
    let maxValue = comparator(maxItem);
    list.forEach((item) => {
        const myValue = comparator(item);
        if (myValue > maxValue) {
            maxValue = myValue;
            maxItem = item;
        }
    });
    return maxItem;
}

export function min<T>(list: T[], comparator: (val: T) => number) {
    if (list.length <= 0) {
        return undefined;
    }
    let maxItem = list[0];
    let maxValue = comparator(maxItem);
    list.forEach((item) => {
        const myValue = comparator(item);
        if (myValue < maxValue) {
            maxValue = myValue;
            maxItem = item;
        }
    });
    return maxItem;
}
