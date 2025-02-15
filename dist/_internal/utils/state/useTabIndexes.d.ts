import { ComponentPropsWithoutRef, ElementType } from "react";
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
export declare const useTabIndexes: <T extends Record<string, "auto">>(propertySettings: T) => Record<keyof T, number>;
/**
 * tabIndexプロパティ用型定義 ComponentのProps等に用いる。
   *
   * @example
   * - 単数
   * ```
   * const ExampleComponent = ({
   *   tabIndex,
   * }: {
   *   tabIndex: TabIndex
   * }) => ...
   * ```
   *
   * - 複数
   * ```
   * const ExampleComponent = ({
   *   tabIndex<{
   *     a: number,
   *     b: number,
   *   }>,
   * }: {
   *   tabIndex: TabIndex
   * }) => ...
   * ```
 */
export type TabIndex<T extends (Record<string, number | TabIndex<any> | undefined>) = Record<string, never>> = (number) | ({
    [Key in keyof T]: T[Key] extends "" ? number : T[Key];
}) | (// partial
{
    [Key in keyof T]?: T[Key] extends "" ? number : T[Key];
} & {
    __others: TabindexDefaultArgs["__others"];
});
export declare const TabIndexes: {
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
    from: <T extends Record<string, number | TabIndex<any> | undefined>>(tabIndex: TabIndex<T> | undefined) => Omit<T, keyof TabindexDefaultArgs> & TabIndexDefaultMembers;
};
type TabIndexDefaultMembers = {
    latest: number;
};
type TabindexDefaultArgs = {
    __others: number;
};
export type TabIndexProp<From extends ElementType> = ComponentPropsWithoutRef<From>["tabIndex"];
export type TabIndexPropObj<From extends ElementType> = ComponentPropsWithoutRef<From>["tabIndex"] extends TabIndex<infer T> ? T : never;
export {};
//# sourceMappingURL=useTabIndexes.d.ts.map