/**
 * `Object.entries` の型付き値のみ版
 *
 * `obj: { [string]: number }` に<br>
 * `mapper: ([,value]) => value.toString()` を与えると、<br>
 * `return: { [string]: string }` が返還される。
 *
 * @param obj - 変換対象オブジェクト
 * @param mapper - フィールド値変換関数
 */
export const getMappedObject = (obj, mapper) => Object.fromEntries(Object.entries(obj)
    .map(([key, value], index) => [key, mapper([key, value], index)]));
