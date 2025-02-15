import { useTabIndex } from "../context/TabIndexContext";
import { getMappedObject } from "../getMappedObject";
/**
 * tabIndexes オブジェクトを取得するための関数。
 *
 * **推奨: front_web/src/pages 配下、ページ定義でのみ用いてください。**
 *
 * @example
 * ```
 * const tabIndexes = useTabIndexes({
 *   "a": "auto",
 *   "b": "auto",
 *   "c": "auto",
 * });
 *
 * return <button tabIndex={tabIndexes.b} />;
 * ```
 */
export const useTabIndexes = (propertySettings) => {
    const { current } = useTabIndex();
    const base = Math.max(1, current);
    return getMappedObject(propertySettings, ([, value], index) => {
        switch (value) {
            case "auto": return base + index;
            default: throw new Error(`${value} is undefined property in useTabIndexes() args.`);
        }
    });
};
export const TabIndexes = {
    /**
     * TabIndex<T> をオブジェクトとして扱える形に変換する。
     *
     * @example
     * ```
     * // tabIndex: TabIndex<T>
     * const tabIndexes = TabIndexes.from(tabIndex);
     * return <button tabIndex={tabIndexes.latest} />;
     * ```
     */
    from: (tabIndex) => {
        const latestIndex = (() => {
            const recursiveSearch = (current) => typeof current === "object"
                ? Object.values(current)
                    .flatMap((next) => typeof next === "number"
                    ? [next]
                    : recursiveSearch(next))
                : [current ?? 0];
            const indexes = recursiveSearch(tabIndex);
            const max = Math.max(...indexes);
            return isFinite(max)
                ? max
                : undefined;
        })();
        const isObject = (it) => typeof it === "object";
        return new Proxy({}, {
            get(_, prop) {
                const key = prop;
                if (isObject(tabIndex))
                    return tabIndex?.[key] ?? latestIndex;
                return tabIndex;
            },
        });
    },
};
