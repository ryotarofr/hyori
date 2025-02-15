import useSWR from "swr";
import { useSWRConfig } from "swr/_internal";
import useSWRMutation from "swr/mutation";
import { environment } from "./_internal/environments/environment";
import { getFileFromFetchResponse } from "./_internal/utils/getFileFromFetchResponse";
import { EmptyObject } from "./_internal/types/EmptyObject";
import { Falsy } from "./_internal/types/Falsy";
export const defaultApiSchema = {
    components: {},
    paths: {},
};
// 内部で利用するグローバルな API スキーマ（ユーザ設定により上書き可能）
let globalApiSchema = defaultApiSchema;
const defaultLoadingBoundary = () => ({ track: (p) => p });
const defaultErrorHandler = () => ({ alertSnwError: () => () => { } });
let _useLoadingBoundary = defaultLoadingBoundary;
let _useErrorHandler = defaultErrorHandler;
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
export const setApiLibDeps = (deps) => {
    if (deps.useLoadingBoundary)
        _useLoadingBoundary = deps.useLoadingBoundary;
    if (deps.useErrorHandler)
        _useErrorHandler = deps.useErrorHandler;
    if (deps.apiSchema) {
        globalApiSchema = deps.apiSchema;
    }
};
/**
 * RESTful API base url.
 */
const apiBaseUrl = `${location.origin}${environment.appContext}/api/v1`;
/**
 * fetch 後の response 変換処理
 */
const fetchResponseHandler = (responseAs) => async (response) => {
    // エラー時はResponseをJSONとして解釈する
    if (!response.ok) {
        throw await fetchResponseAsJsonHandler(response) ?? {
            code: response.status.toString(),
        };
    }
    if (responseAs === "file") {
        return await getFileFromFetchResponse(response);
    }
    else {
        return await fetchResponseAsJsonHandler(response);
    }
};
/**
 * response から JSON を取得
 */
const fetchResponseAsJsonHandler = async (response) => {
    return await (async () => {
        try {
            return await response.json();
        }
        catch {
            return undefined;
        }
    })();
};
const useCommonApiFetch = ({ showIndicator = true, }) => {
    const { track } = _useLoadingBoundary();
    return {
        createFetch: (promise) => {
            return showIndicator
                ? track(promise)
                : promise;
        },
    };
};
const OrFn = {
    get: (raw) => raw instanceof Function ? raw() : raw,
};
const FalsyOrFn = {
    map: (raw, mapper) => {
        const falsy = OrFn.get(raw);
        if (!falsy)
            return undefined;
        return mapper(falsy);
    },
};
const QueryOption = {
    fromArg: (raw) => {
        const _default = { get: undefined, unfetchable: false };
        if (raw == null)
            return _default;
        if (EmptyObject.is(raw))
            return _default;
        const query = typeof raw === "function"
            ? Falsy.get(raw())
            : raw;
        return {
            get: query,
            unfetchable: raw === false || (typeof raw === "function" && !query),
        };
    },
};
const getPathFromTemplateAndPlaceholderMap = (pathTemplate, placeholderMap) => {
    const path = Object.entries(placeholderMap ?? {})
        .reduce((prev, [key, value]) => {
        return prev.map((it) => it === `{${key}}` ? `${value}` : it);
    }, pathTemplate.split("/"))
        .join("/");
    return path;
};
const getUrlFromPathAndQueryMap = (path, queryMap) => {
    const searchParams = new URLSearchParams(queryMap).toString();
    const hasSearchParam = searchParams !== "";
    return (hasSearchParam
        ? `${path}?${searchParams}`
        : path);
};
const getDefinedQueriesMap = (_rawQueryMap) => {
    const rawQueryMap = OrFn.get(_rawQueryMap);
    if (!rawQueryMap)
        return {};
    return Object.entries((rawQueryMap))
        .map(([key, value]) => ([key, value !== undefined ? value : ""]));
};
const UseApiKeys = (() => {
    return {
        from: (val) => val,
    };
})();
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
export const useApiQuery = (pathTemplate, ...options) => {
    const [option] = options;
    const queryOption = QueryOption.fromArg(option?.query);
    const responseAs = option?.responseAs ?? "json";
    const { alertSnwError } = _useErrorHandler();
    const { createFetch } = useCommonApiFetch({
        showIndicator: option?.showIndicator ?? !option?.suspense,
    });
    const fetcher = (args) => {
        const { path: pathTemplate, placeholder: placeholderMap, query: queryMap, } = args;
        const path = getPathFromTemplateAndPlaceholderMap(pathTemplate, placeholderMap);
        const url = getUrlFromPathAndQueryMap(path, queryMap);
        console.log(`useSWR by ${url} [${JSON.stringify(args)}]`);
        return createFetch(fetch(`${apiBaseUrl}${url}`, {
            method: "get",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then(fetchResponseHandler(responseAs)));
    };
    // pathTemplate が値を持っていれば中身をTupleに変換
    const placeholder = (option?.placeholder ?? {});
    const keys = FalsyOrFn.map(pathTemplate, (path) => {
        // query が fetch 条件を満たしていない場合 undefined を返却
        if (queryOption.unfetchable)
            return;
        return UseApiKeys.from({
            path,
            placeholder,
            // searchParam は値を持つもののみに絞り込む
            query: getDefinedQueriesMap(queryOption.get),
        });
    });
    const swrConfig = {
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        onError: (err, key) => {
            const mapper = option?.errorMapper;
            const error = err;
            alertSnwError(mapper)(error, { swrKey: key });
        },
        ...option,
    };
    return useSWR(keys, fetcher, swrConfig);
    ;
};
// type UseApiQueryFn<
//   Url extends keyof paths,
//   Method extends keyof GetNested<paths, [Url]>,
//   ResponseMap extends ResponseMapFromSchemaRespopnses<
//     GetNested<paths, [Url, Method, "responses"]>
//   > = ResponseMapFromSchemaRespopnses<
//     GetNested<paths, [Url, Method, "responses"]>
//   >,
//   Response = ResponseMap["ok"],
//   Error = ResponseMap["error"],
// > = (
//   pathTemplate: Url,
//   // method: Method,
//   // ...options: (
//   //   ToBeOptionalArgIfNotRequired<
//   //     SWRConfiguration<Response, Error, BareFetcher<Response>>
//   //     & ToRecord<"contentType", ContentTypeOrNeverWhenJsonNotExists, ContentType>
//   //     & ToRecord<"placeholder", Placeholder>
//   //     & ToRecord<"query", Method extends "get" ? never : Query>
//   //     & ToRecord<"responseAs", ResponseAs extends "json" ? never : ResponseAs, ResponseAs>
//   //     & CommonApiFetchProps
//   //   >
//   // )
// ) => SWRResponse<Response, Error>;
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
export const useApiMutation = (pathTemplate, method, ...options) => {
    const [option] = options;
    const queryOption = QueryOption.fromArg(option?.query);
    const contentTypeRaw = (option?.contentType ?? "application/json").toString();
    const contentTypeObj 
    // `multipart/form-data` 時は `Content-Type` を設定しない。
    // https://fetch.spec.whatwg.org/#request-class
    = contentTypeRaw === "multipart/form-data"
        ? undefined
        : { "Content-Type": contentTypeRaw };
    const responseAs = option?.responseAs ?? "json";
    const { alertSnwError } = _useErrorHandler();
    const { mutate } = useSWRConfig();
    const { createFetch } = useCommonApiFetch(option ?? {});
    const toJsonBlob = (value) => {
        const valueJson = JSON.stringify(value);
        const jsonBlob = new Blob([valueJson], { type: "application/json" });
        return jsonBlob;
    };
    const generateBody = (arg) => {
        if (contentTypeRaw === "application/json") {
            return JSON.stringify(arg);
        }
        if (contentTypeRaw === "multipart/form-data") {
            // 全項目を Blob として送信。
            // Blob でない値がある場合は、一律 `application/json` に変換する。
            const body = new FormData();
            Object.entries(arg ?? {})
                .forEach(([key, value]) => {
                if (value === undefined)
                    return;
                if (value instanceof Blob)
                    return body.append(key, value);
                if (Array.isArray(value)) {
                    const nonBlobs = value.filter((value) => {
                        if (value instanceof Blob) {
                            body.append(key, value);
                            return false;
                        }
                        return true;
                    });
                    if (nonBlobs.length === 0)
                        return;
                    const jsonBlob = toJsonBlob(nonBlobs);
                    return body.append(key, jsonBlob);
                }
                const jsonBlob = toJsonBlob(value);
                body.append(key, jsonBlob);
            });
            return body;
        }
        return arg;
    };
    const fetcher = (args, { arg }) => {
        const { path: pathTemplate, placeholder: placeholderMap, query: queryMapRaw, } = args;
        const queryMap = (method === "get"
            ? getDefinedQueriesMap(arg)
            : queryMapRaw);
        const path = getPathFromTemplateAndPlaceholderMap(pathTemplate, placeholderMap);
        const url = getUrlFromPathAndQueryMap(path, queryMap);
        const body = (method === "get" ? undefined : generateBody(arg));
        console.log(`useSWRMutation by ${url} [${JSON.stringify(args)}] ${JSON.stringify(arg)}`);
        return createFetch(fetch(`${apiBaseUrl}${url}`, {
            method: method.toString(),
            headers: {
                ...contentTypeObj,
            },
            body,
        })
            .then(fetchResponseHandler(responseAs)))
            .then((it) => {
            mutate(args);
            return it;
        });
    };
    const placeholder = (option?.placeholder ?? {});
    const keys = FalsyOrFn.map(pathTemplate, (path) => {
        if (queryOption.unfetchable)
            return;
        return UseApiKeys.from({
            path,
            placeholder,
            query: getDefinedQueriesMap(queryOption.get),
        });
    });
    return useSWRMutation(keys, fetcher, {
        onError: (err, key) => {
            const mapper = option?.errorMapper;
            const error = err;
            alertSnwError(mapper)(error, {
                swrKey: key,
            });
        },
        ...option,
    });
};
export const useApiConfig = () => {
    const config = useSWRConfig();
    return {
        ...config,
        mutate: config.mutate,
    };
};
