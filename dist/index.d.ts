import { BareFetcher, SWRConfiguration } from "swr/_internal";
import { EmptyObject } from "./_internal/types/EmptyObject";
import { Falsy } from "./_internal/types/Falsy";
import { TemplateLiteralPlaceholder } from "./_internal/types/TemplateLiteralPlaceholder";
import { ToRecord } from "./_internal/types/ToRecord";
/**
 * API スキーマ情報（components/paths）についてはユーザ側で実装
 */
export interface ApiSchema {
    components: Record<string, any>;
    paths: Record<string, any>;
}
export declare const defaultApiSchema: ApiSchema;
/**
 * エラーメッセージの整形関数の型（ユーザ側で実装してください）
 */
export type ErrorMapper = (error: any) => string;
/**
 * ローディングインジケータ／エラーハンドリングの実装はユーザ側で用意してください。
 * ここではデフォルト実装として「何もしない」関数を定義しています。
 */
type LoadingBoundaryType = () => {
    track: <T>(promise: Promise<T>) => Promise<T>;
};
type ErrorHandlerType = () => {
    alertSnwError: (mapper?: ErrorMapper) => (error: unknown, config: {
        swrKey: unknown;
    }) => void;
};
/**
 * ライブラリ利用前に、以下の setter を呼び出してユーザ実装を注入。
 *
 * 例:
 * ```ts
 * import { setApiLibDeps } from "your-api-lib";
 * import { components, paths } from "./schema.gen";
 * import { useMyLoadingBoundary } from "./context/MyLoadingBoundary";
 * import { useMyErrorHandler } from "./context/MyErrorHandler";
 *
 * setApiLibDeps({
 *   apiSchema: { components, paths },
 *   useLoadingBoundary: useMyLoadingBoundary,
 *   useErrorHandler: useMyErrorHandler,
 * });
 * ```
 */
export declare const setApiLibDeps: (deps: {
    useLoadingBoundary?: LoadingBoundaryType;
    useErrorHandler?: ErrorHandlerType;
    apiSchema?: ApiSchema;
}) => void;
/**
 * Union型情報から nullable な部分を抽出する。
 */
type PickNullablePart<T> = Exclude<T, NonNullable<T>>;
/**
 * Nullableを伝播しつつ指定のfieldの型を取得する
 */
type GetFieldFromNullable<From, Key> = Key extends keyof NonNullable<From> ? From extends NonNullable<From> ? From[Key] : NonNullable<From>[Key] | PickNullablePart<From> : never;
/**
 * ネストされたプロパティの型を取得する。
 */
type GetNested<From, Keys> = [
    From
] extends [never] ? never : Keys extends [infer Head, ...infer Tails] ? Head extends keyof NonNullable<From> ? Tails extends [] ? GetFieldFromNullable<From, Head> : GetNested<GetFieldFromNullable<From, Head>, Tails> : never : never;
/**
 * OpenAPI schema の responses セクションから、fetch の戻り値型を取得する。
 */
type ResponseStatusMapFromSchemaRespopnses<Responses> = {
    [StatusCode in keyof Responses]: StatusCode extends TemplateLiteralPlaceholder ? {
        __statuscodestr__: `${StatusCode}`;
    } & GetNested<Responses, [
        StatusCode,
        "content",
        keyof GetNested<Responses, [StatusCode, "content"]>
    ]> : never;
}[keyof Responses];
type OmitSpecificStatusCodeStr<Pattern, Responses> = Omit<Extract<ResponseStatusMapFromSchemaRespopnses<Responses>, {
    __statuscodestr__: Pattern;
}>, "__statuscodestr__">;
type ResponseMapFromSchemaRespopnses<Responses> = {
    ok: OmitSpecificStatusCodeStr<`${1 | 2 | 3}${string}`, Responses>;
    error: OmitSpecificStatusCodeStr<`${4 | 5}${string}`, Responses>;
};
/**
 * schema.gen.ts から API が受送信するデータ型を取得するための wrapper。
 */
export type ApiTypes<Key extends keyof ApiSchema["components"]> = ApiSchema["components"][Key];
export type ApiType<Url extends keyof ApiSchema["paths"], Method extends keyof GetNested<ApiSchema["paths"], [Url]>> = GetNested<ApiSchema["paths"], [Url, Method]>;
/**
 * object union (\{\} | \{\} | ...) に対して keyof を行う。
 */
type KeyOfObjectUnion<T> = T extends {
    [Key in PropertyKey]: unknown;
} ? keyof T : never;
/**
 * schema.gen.ts で登場する http method を抽出したもの。
 */
type HttpMethod = KeyOfObjectUnion<ApiSchema["paths"][keyof ApiSchema["paths"]]>;
/**
 * useApi* に共通する通信時処理を提供するHook
 */
type CommonApiFetchProps = {
    showIndicator?: boolean;
};
type OrFn<T> = [T] extends [never] ? never : T | (() => T);
declare const OrFn: {
    get: <T>(raw: OrFn<T>) => T;
};
type FalsyOrFn<T> = OrFn<Falsy<T>>;
declare const FalsyOrFn: {
    map: <T, Result>(raw: FalsyOrFn<T>, mapper: (value: T) => Result) => FalsyOrFn<Result>;
};
type If<Cond, T, Else = never> = Cond extends true ? T : [Cond] extends [never] ? Else : T;
type QueryArg<Query> = If<Query, Query | (() => Falsy<Query>)>;
type OmitOrNever<T, Key extends PropertyKey> = [
    T
] extends [never] ? never : T extends undefined ? T : Omit<T, Key>;
type RequiredKeys<T> = {
    [K in keyof T]-?: EmptyObject extends Pick<T, K> ? never : K;
}[keyof T];
type ToBeOptionalArgIfNotRequired<T> = [
    RequiredKeys<T>
] extends [never] ? [] | [T] : [T];
export type ApiQuery<Url extends keyof ApiSchema["paths"], Method extends keyof ApiSchema["paths"][Url]> = OmitOrNever<GetNested<ApiSchema["paths"], [Url, Method, "parameters", "query"]>, "request">;
export type UseApiKeys = {
    path: string;
    placeholder: Record<string, unknown>;
    query: Record<string, unknown>;
};
type ResponseAsFrom<T> = T extends File ? "file" : T extends Blob ? "blob" : "json";
/**
 * APIとの通信用Hookを構築する関数。
 * HTTP[GET]時に用いる。
 *
 * API 通信に、schema.gen.ts から型情報を付与したもの。
 * `useSWR()`のラッパーで、fetch の結果を state として提供する。
 *
 * @param pathTemplate - 通信対象のAPIエンドポイントを示す文字列（URL）。
 * @param options - SWRコンフィグと、必要なら [placeholder, query]。
 * @param options.placeholder - `path`内のプレースホルダーに与える値を設定する。
 * @param options.query - url末尾に queryParams として与える値を設定する。
 * @param options.responseAs - 必要なら、戻り値の変換処理を文字列にて指定する。デフォルトは "json"。
 * @param options.showIndicator - 通信中インジケーターの[表示/非表示]。デフォルトは`true`。
 * @param options.errorMapper - 通信結果がエラーだった際に表示されるメッセージをコントロールする関数。
 * @returns SWRResponse
 *
 * @example
 * ```
 * const {
 *   data: samples, // 通信結果が入る。
 * } = useApiQuery("/samples");
 *
 * // 描画時に自動で通信が実行される。
 * ```
 */
export declare const useApiQuery: <Url extends Extract<keyof QueryPaths, string>, Placeholder extends GetNested<QueryPaths, [Url, "get", "parameters", "path"]>, Query extends ApiQuery<Url, "get">, ResponseMap extends ResponseMapFromSchemaRespopnses<GetNested<QueryPaths, [Url, "get", "responses"]>>, Response extends ResponseMap["ok"], ResponseAs extends ResponseAsFrom<Response>, Error extends ResponseMap["error"], SwrOptions extends SWRConfiguration<Response, Error, BareFetcher<Response>>>(pathTemplate: FalsyOrFn<Url>, ...options: (ToBeOptionalArgIfNotRequired<SwrOptions & ToRecord<"placeholder", Placeholder> & ToRecord<"query", QueryArg<Query>> & ToRecord<"responseAs", ResponseAs extends "json" ? never : ResponseAs, ResponseAs> & CommonApiFetchProps & {
    errorMapper?: ErrorMapper;
}>)) => import("swr").SWRResponse<Response, Error, SWRConfiguration<Response, Error, ((arg: "") => import("swr/dist/_internal").FetcherResponse<Response>) | ((arg: UseApiKeys) => import("swr/dist/_internal").FetcherResponse<Response>) | ((arg: "" | UseApiKeys) => import("swr/dist/_internal").FetcherResponse<Response>)> | undefined>;
type QueryMethod = Extract<HttpMethod, "get">;
type QueryPaths = {
    [Key in keyof ApiSchema["paths"] as ApiSchema["paths"][Key] extends {
        [K in QueryMethod]?: unknown;
    } ? Key : never]: ApiSchema["paths"][Key];
};
/**
 * APIとの通信用Hookを構築する関数。
 * HTTP[POST, PUT, PATCH, DELETE]時に用いる。
 * また、GET通信を遅延実行したい際にも用いることができる。
 *
 * API 通信に、schema.gen.ts から型情報を付与したもの。
 * `useSWRMutation()`のラッパーで、fetch の結果を state として提供する。
 *
 * @param pathTemplate - 通信対象のAPIエンドポイントを示す文字列（URL）。
 * @param method - HTTPメソッド名
 * @param options - SWRコンフィグと、必要なら [placeholder, query]。
 * @param options.placeholder - `path`内のプレースホルダーに与える値を設定する。
 * @param options.query - url末尾に queryParams として与える値を設定する。GETリクエストの場合はここではなく、戻り値のtrigger関数に渡す。
 * @param options.contentType - 必要なら、HTTP-Header の ContentType を選択する。デフォルトは `application/json`。
 * @param options.responseAs - 必要なら、戻り値の変換処理を文字列にて指定する。デフォルトは "json"。
 * @param options.showIndicator - 通信中インジケーターの[表示/非表示]。デフォルトは`true`。
 * @param options.errorMapper - 通信結果がエラーだった際に表示されるメッセージをコントロールする関数。
 * @returns SWRMutationHook
 *
 * @example
 * ```
 * const {
 *   data: samples, // 通信結果が入る。
 *   trigger: searchSamples, // 通信を実行する関数。
 * } = useApiMutation("/samples/search", "post");
 * ```
 */
export declare const useApiMutation: <Url extends keyof ApiSchema["paths"], Method extends keyof GetNested<ApiSchema["paths"], [Url]>, Placeholder extends GetNested<ApiSchema["paths"], [Url, Method, "parameters", "path"]>, QueryBase extends GetNested<ApiSchema["paths"], [Url, Method, "parameters", "query"]>, Query extends OmitOrNever<QueryBase, "request">, Content extends GetNested<ApiSchema["paths"], [Url, Method, "requestBody", "content"]>, ContentType extends keyof NonNullable<Content>, ContentTypeOrNeverWhenJsonNotExists extends ([Content] extends [never] ? never : [GetNested<Content, ["application/json"]>] extends [never] ? ContentType : never), BodyRaw extends GetNested<Content, [ContentType]>, Body extends (Method extends "get" ? Query : BodyRaw), ResponseMap extends ResponseMapFromSchemaRespopnses<GetNested<ApiSchema["paths"], [Url, Method, "responses"]>>, Response extends ResponseMap["ok"], ResponseAs extends ResponseAsFrom<Response>, Error extends ResponseMap["error"]>(pathTemplate: FalsyOrFn<Url>, method: Method, ...options: (ToBeOptionalArgIfNotRequired<SWRConfiguration<Response, Error, BareFetcher<Response>> & ToRecord<"contentType", ContentTypeOrNeverWhenJsonNotExists, ContentType> & ToRecord<"placeholder", Placeholder> & ToRecord<"query", QueryArg<(Method extends "get" ? never : Query)>> & ToRecord<"responseAs", ResponseAs extends "json" ? never : ResponseAs, ResponseAs> & CommonApiFetchProps & {
    errorMapper?: ErrorMapper;
}>)) => import("swr/dist/mutation").SWRMutationResponse<Response, Error, Falsy<UseApiKeys> | (() => Falsy<UseApiKeys>), Body>;
export declare const useApiConfig: () => {
    mutate: ((mutator: (key: UseApiKeys) => boolean) => void);
    cache: import("swr").Cache;
    errorRetryInterval: number;
    errorRetryCount?: number;
    loadingTimeout: number;
    focusThrottleInterval: number;
    dedupingInterval: number;
    refreshInterval?: number | ((latestData: any) => number) | undefined;
    refreshWhenHidden?: boolean;
    refreshWhenOffline?: boolean;
    revalidateOnFocus: boolean;
    revalidateOnReconnect: boolean;
    revalidateOnMount?: boolean;
    revalidateIfStale: boolean;
    shouldRetryOnError: boolean | ((err: any) => boolean);
    keepPreviousData?: boolean;
    suspense?: boolean;
    fallbackData?: any;
    fetcher?: BareFetcher<unknown> | undefined;
    use?: import("swr").Middleware[];
    fallback: {
        [key: string]: any;
    };
    isPaused: () => boolean;
    onLoadingSlow: (key: string, config: Readonly<import("swr/dist/_internal").PublicConfiguration<any, any, BareFetcher<unknown>>>) => void;
    onSuccess: (data: any, key: string, config: Readonly<import("swr/dist/_internal").PublicConfiguration<any, any, BareFetcher<unknown>>>) => void;
    onError: (err: any, key: string, config: Readonly<import("swr/dist/_internal").PublicConfiguration<any, any, BareFetcher<unknown>>>) => void;
    onErrorRetry: (err: any, key: string, config: Readonly<import("swr/dist/_internal").PublicConfiguration<any, any, BareFetcher<unknown>>>, revalidate: import("swr").Revalidator, revalidateOpts: Required<import("swr").RevalidatorOptions>) => void;
    onDiscarded: (key: string) => void;
    compare: (a: any, b: any) => boolean;
    isOnline: () => boolean;
    isVisible: () => boolean;
};
export {};
//# sourceMappingURL=index.d.ts.map