import { ComponentPropsWithoutRef, ElementType } from "react";

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
export const useTabIndexes = <
  T extends Record<string, "auto">
>(propertySettings: T): Record<keyof T, number> => {
  const { current } = useTabIndex();
  const base = Math.max(1, current);

  return getMappedObject(
    propertySettings,
    ([, value], index) => {
      switch(value) {
      case "auto": return base + index;
      default: throw new Error(`${value} is undefined property in useTabIndexes() args.`);
      }
    },
  );
};

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
export type TabIndex<
  T extends (Record<string, number | TabIndex<any> | undefined>) = Record<string, never>
> = ( // bulk
      number
    ) | ( // full
      {
        [Key in keyof T]: T[Key] extends ""
          ? number
          : T[Key]
      }
    ) | ( // partial
      {
        [Key in keyof T]?: T[Key] extends ""
          ? number
          : T[Key]
      } & {
        __others: TabindexDefaultArgs["__others"];
      }
    );

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
  from: <
    T extends Record<string, number | TabIndex<any> | undefined>,
  >(tabIndex: TabIndex<T> | undefined) => {
    const latestIndex = (() => {
      const recursiveSearch = (current: any): number[] =>
        typeof current === "object"
          ? Object.values(current)
            .flatMap((next) =>
              typeof next === "number"
                ? [next]
                : recursiveSearch(next),
            )
          : [current ?? 0];
      const indexes = recursiveSearch(tabIndex);
      const max = Math.max(...indexes);
      return isFinite(max)
        ? max
        : undefined;
    })();
    const isObject = (it: unknown): it is Record<keyof T, any> =>
      typeof it === "object";
    return new Proxy({} as Record<string, any>, {
      get(_, prop) {
        const key = prop as keyof T;
        if (isObject(tabIndex))
          return tabIndex?.[key] ?? latestIndex;
        return tabIndex;
      },
    }) as Omit<T, keyof TabindexDefaultArgs> & TabIndexDefaultMembers;
  },
};

type TabIndexDefaultMembers = {
  latest: number;
};

type TabindexDefaultArgs = {
  __others: number;
};

export type TabIndexProp<
  From extends ElementType
> = ComponentPropsWithoutRef<From>["tabIndex"];

export type TabIndexPropObj<
  From extends ElementType
> = ComponentPropsWithoutRef<From>["tabIndex"] extends TabIndex<infer T>
  ? T : never;
