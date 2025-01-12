import useSWR from "swr";
import { BareFetcher, SWRConfiguration, useSWRConfig } from "swr/_internal";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";

import { environment } from "../_internal/environments/environment";
import { useLoadingBoundary } from "../_internal/utils/context/LoadingBoundaryContext";
import { SnwErrorMapper, useSnwErrorHandler } from "@/fn/context/SnwErrorHandlerContext";
import { getFileFromFetchResponse } from "../_internal/utils/getFileFromFetchResponse";
import { components, paths } from "../schema.gen";
import { EmptyObject } from "../_internal/types/EmptyObject";
import { Falsy } from "../_internal/types/Falsy";
import { TemplateLiteralPlaceholder } from "../_internal/types/TemplateLiteralPlaceholder";
import { ToRecord } from "../_internal/types/ToRecord";

/**
 * Union型情報から nullable な部分を抽出する。
 */
type PickNullablePart<T> = Exclude<T, NonNullable<T>>;
/**
 * Nullableを伝播しつつ指定のfieldの型を取得する
 */
type GetFieldFromNullable<From, Key> =
  Key extends keyof NonNullable<From>
    ? From extends NonNullable<From>
      ? From[Key]
      : NonNullable<From>[Key] | PickNullablePart<From>
    : never;

/**
 * ネストされたプロパティの型を取得する。
 */
type GetNested<From, Keys> =
  [From] extends [never]
    ? never
    : Keys extends [infer Head, ...infer Tails]
      ? Head extends keyof NonNullable<From>
        ? Tails extends []
          ? GetFieldFromNullable<From, Head>
          : GetNested<GetFieldFromNullable<From, Head>, Tails>
        : never
      : never;

/**
 * OpenAPI schema の responses セクションから、fetch の戻り値型を取得する。
 */
type ResponseStatusMapFromSchemaRespopnses<Responses> =
  {
    [StatusCode in keyof Responses]: StatusCode extends TemplateLiteralPlaceholder
      ? {
        __statuscodestr__: `${StatusCode}`;
        // statusCode: StatusCode;
        // description?: GetNested<Responses, [StatusCode, "description"]>;
        // contentType: keyof GetNested<Responses, [StatusCode, "content"]>,
      } & GetNested<
        Responses,
        [StatusCode, "content", keyof GetNested<Responses, [StatusCode, "content"]>]
      >
      : never
  }[keyof Responses];

type OmitSpecificStatusCodeStr<Pattern, Responses> = Omit<
  Extract<
    ResponseStatusMapFromSchemaRespopnses<Responses>,
    {__statuscodestr__: Pattern}
  >,
  "__statuscodestr__"
>;
type ResponseMapFromSchemaRespopnses<Responses> = {
  ok: OmitSpecificStatusCodeStr<`${1 | 2 | 3}${string}`, Responses>;
  error: OmitSpecificStatusCodeStr<`${4 | 5}${string}`, Responses>;
};

/**
 * schema.gen.ts から API が受送信するデータ型を取得するための wrapper。
 */
export type ApiTypes<Key extends keyof components["schemas"]>
  = components["schemas"][Key];

export type ApiType<
  Url extends keyof paths,
  Method extends keyof GetNested<paths, [Url]>,
> = GetNested<paths, [Url, Method]>;

/**
 * object union (\{\} | \{\} | ...) に対して keyof を行う。
 */
type KeyOfObjectUnion<T> = T extends { [Key in PropertyKey]: unknown } ? keyof T : never;
/**
 * schema.gen.ts で登場する http method を抽出したもの。
 */
type HttpMethod = KeyOfObjectUnion<paths[keyof paths]>;

/**
 * RESTful API base url.
 */
const apiBaseUrl = `${location.origin}${environment.appContext}/api/v1`;

/**
 * fetch 後の response 変換処理
 */
const fetchResponseHandler
  = (responseAs: string) =>
    async (response: Response) => {
      // エラー時はResponseをJSONとして解釈する
      if (!response.ok) {
        throw await fetchResponseAsJsonHandler(response) ?? {
          code: response.status.toString(),
        };
      }

      if (responseAs === "file") {
        return await getFileFromFetchResponse(response);
      } else {
        return await fetchResponseAsJsonHandler(response);
      }
    };

/**
 * response から JSON を取得
 */
const fetchResponseAsJsonHandler
  = async (response: Response) => {
    return await (async () => {
      try {
        return await response.json();
      } catch {
        return undefined;
      }
    })();
  };

/**
 * useApi* に共通する通信時処理を提供するHook
 */
type CommonApiFetchProps = {
  showIndicator?: boolean;
};
const useCommonApiFetch = ({
  showIndicator = true,
}: CommonApiFetchProps) => {
  const { track } = useLoadingBoundary();
  return {
    createFetch: <T>(promise: Promise<T>) => {
      return showIndicator
        ? track(promise)
        : promise;
    },
  };
};

type OrFn<T> = [T] extends [never] ? never : T | (() => T);
const OrFn = {
  get: <T>(raw: OrFn<T>): T => raw instanceof Function ? raw() : raw,
};
type FalsyOrFn<T> = OrFn<Falsy<T>>;
const FalsyOrFn = {
  map: <T, Result>(
    raw: FalsyOrFn<T>,
    mapper: (value: T) => Result,
  ): FalsyOrFn<Result> => {
    const falsy = OrFn.get(raw);
    if (!falsy) return undefined as FalsyOrFn<Result>;
    return mapper(falsy) as FalsyOrFn<Result>;
  },
};

type If<Cond, T, Else = never> =
  Cond extends true
    ? T
    : [Cond] extends [never]
      ? Else
      : T;

type QueryArg<Query> =
  If<
    Query,
    Query | (() => Falsy<Query>)
  >;
type QueryOption<Query> = {
  get: Query | undefined;
  unfetchable: boolean;
};
const QueryOption = {
  fromArg: <Query>(
    raw: EmptyObject | QueryArg<Query> | undefined,
  ): QueryOption<Query> => {
    const _default = { get: undefined, unfetchable: false };
    if (raw == null) return _default;
    if (EmptyObject.is(raw)) return _default;
    const query = typeof raw === "function"
      ? Falsy.get((raw as (() => Falsy<Query>))())
      : raw as Query;
    return {
      get: query,
      unfetchable: raw === false || (typeof raw === "function" && !query),
    };
  },
};
const getPathFromTemplateAndPlaceholderMap = (
  pathTemplate: string,
  placeholderMap: Record<string, unknown> | undefined,
) => {
  const path
      = Object.entries(placeholderMap ?? {})
        .reduce<string[]>((prev, [key, value]) => {
          return prev.map((it) => it === `{${key}}` ? `${value}` : it);
        }, pathTemplate.split("/"))
        .join("/");
  return path;
};
const getUrlFromPathAndQueryMap = (
  path: string,
  queryMap: Record<string, unknown>) => {
  const searchParams = new URLSearchParams(queryMap as Record<string, string>).toString();
  const hasSearchParam = searchParams !== "";
  return (
    hasSearchParam
      ? `${path}?${searchParams}`
      : path
  );
};
const getDefinedQueriesMap = (_rawQueryMap?: OrFn<Record<string, unknown>>) => {
  const rawQueryMap = OrFn.get(_rawQueryMap);
  if (!rawQueryMap) return {};
  return Object.entries((rawQueryMap) as Record<string, string>)
    .map(([key, value]) => ([key, value !== undefined ? value : ""]));
};

type OmitOrNever<T, Key extends PropertyKey> =
      [T] extends [never]
        ? never
        : T extends undefined
          ? T
          : Omit<T, Key>;

type RequiredKeys<T> = { [K in keyof T]-?: EmptyObject extends Pick<T, K> ? never : K }[keyof T];
type ToBeOptionalArgIfNotRequired<T> =
  [RequiredKeys<T>] extends [never]
    ? [] | [T]
    : [T];

export type ApiQuery<
  Url extends keyof paths,
  Method extends keyof paths[Url]
> = OmitOrNever<
    GetNested<paths, [Url, Method, "parameters", "query"]>,
    "request"
  >;

export type UseApiKeys = {
  path: string;
  placeholder: Record<string, unknown>;
  query: Record<string, unknown>;
};
const UseApiKeys = (() => {
  return {
    from: (val: UseApiKeys) => val,
  };
})();

type ResponseAsFrom<T> =
  T extends File
    ? "file"
    : T extends Blob
      ? "blob"
      : "json";

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
 * @param options.snwErrorMapper - 通信結果がエラーだった際に表示されるメッセージをコントロールする関数。
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
export const useApiQuery
  = <
    Url extends keyof QueryPaths,
    Placeholder extends GetNested<QueryPaths, [Url, "get", "parameters", "path"]>,
    Query extends ApiQuery<Url, "get">,
    ResponseMap extends ResponseMapFromSchemaRespopnses<
      GetNested<QueryPaths, [Url, "get", "responses"]>
    >,
    Response extends ResponseMap["ok"],
    ResponseAs extends ResponseAsFrom<Response>,
    Error extends ResponseMap["error"],
    SwrOptions extends SWRConfiguration<Response, Error, BareFetcher<Response>>
  >(
    pathTemplate: FalsyOrFn<Url>,
    ...options: (
      ToBeOptionalArgIfNotRequired<
        SwrOptions
        & ToRecord<"placeholder", Placeholder>
        & ToRecord<"query", QueryArg<Query>>
        & ToRecord<"responseAs", ResponseAs extends "json" ? never : ResponseAs, ResponseAs>
        & CommonApiFetchProps
        & { snwErrorMapper?: SnwErrorMapper }
      >
    )
  ) => {
    const [option] = options;
    const queryOption = QueryOption.fromArg<Query>(option?.query);
    const responseAs = option?.responseAs ?? "json";
    const { alertSnwError } = useSnwErrorHandler();
    const { createFetch } = useCommonApiFetch({
      showIndicator: option?.showIndicator ?? !option?.suspense,
    });
    const fetcher = (args: UseApiKeys) => {
      const {
        path: pathTemplate,
        placeholder: placeholderMap,
        query: queryMap,
      } = args;
      const path = getPathFromTemplateAndPlaceholderMap(pathTemplate, placeholderMap);
      const url = getUrlFromPathAndQueryMap(path, queryMap);
      console.log(`useSWR by ${url} [${JSON.stringify(args)}]`);
      return createFetch(
        fetch(`${apiBaseUrl}${url}`, {
          method: "get",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(fetchResponseHandler(responseAs)),
      );
    };
    // pathTemplate が値を持っていれば中身をTupleに変換
    const placeholder = (option?.placeholder ?? {}) as Record<string, unknown>;
    const keys = FalsyOrFn.map(
      pathTemplate,
      (path) => {
        // query が fetch 条件を満たしていない場合 undefined を返却
        if (queryOption.unfetchable) return;
        return UseApiKeys.from({
          path,
          placeholder,
          // searchParam は値を持つもののみに絞り込む
          query: getDefinedQueriesMap(queryOption.get),
        });
      },
    );

    return useSWR<Response, Error, FalsyOrFn<UseApiKeys>, SwrOptions>(keys, fetcher, {
      // refreshInterval: 1000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // revalidateIfStale: true,
      // suspense: true,
      onError: (err, key) => {
        const mapper = option?.snwErrorMapper;
        const error = err as unknown as ApiTypes<"Error">;
        alertSnwError(mapper)(error, {
          swrKey: key,
        });
      },
      ...option as SwrOptions,
    });
  };

type QueryMethod = Extract<HttpMethod, "get">;
type QueryPaths =
  {
    [
    Key in keyof paths as paths[Key] extends { [K in QueryMethod]?: unknown }
      ? Key
      : never
    ]: paths[Key]
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
 * @param options.snwErrorMapper - 通信結果がエラーだった際に表示されるメッセージをコントロールする関数。
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
export const useApiMutation
  = <
    Url extends keyof paths,
    Method extends keyof GetNested<paths, [Url]>,
    Placeholder extends GetNested<paths, [Url, Method, "parameters", "path"]>,
    QueryBase extends GetNested<paths, [Url, Method, "parameters", "query"]>,
    Query extends OmitOrNever<QueryBase, "request">,
    Content extends GetNested<paths, [Url, Method, "requestBody", "content"]>,
    ContentType extends keyof NonNullable<Content>,
    ContentTypeOrNeverWhenJsonNotExists extends (
      [Content] extends [never]
        ? never
        : [GetNested<Content, ["application/json"]>] extends [never]
          ? ContentType
          : never
    ),
    BodyRaw extends GetNested<Content, [ContentType]>,
    Body extends (Method extends "get" ? Query : BodyRaw),
    ResponseMap extends ResponseMapFromSchemaRespopnses<
      GetNested<paths, [Url, Method, "responses"]>
    >,
    Response extends ResponseMap["ok"],
    ResponseAs extends ResponseAsFrom<Response>,
    Error extends ResponseMap["error"],
  >(
    pathTemplate: FalsyOrFn<Url>,
    method: Method,
    ...options: (
      ToBeOptionalArgIfNotRequired<
        SWRConfiguration<Response, Error, BareFetcher<Response>>
        & ToRecord<"contentType", ContentTypeOrNeverWhenJsonNotExists, ContentType>
        & ToRecord<"placeholder", Placeholder>
        & ToRecord<"query", QueryArg<(Method extends "get" ? never : Query)>>
        & ToRecord<"responseAs", ResponseAs extends "json" ? never : ResponseAs, ResponseAs>
        & CommonApiFetchProps
        & { snwErrorMapper?: SnwErrorMapper }
      >
    )
  ) => {
    const [option] = options;
    const queryOption = QueryOption.fromArg<Query>(option?.query);
    const contentTypeRaw = (option?.contentType ?? "application/json").toString();
    const contentTypeObj
      // `multipart/form-data` 時は `Content-Type` を設定しない。
      // https://fetch.spec.whatwg.org/#request-class
      = contentTypeRaw === "multipart/form-data"
        ? undefined
        : { "Content-Type": contentTypeRaw };
    const responseAs = option?.responseAs ?? "json";
    const { alertSnwError } = useSnwErrorHandler();
    const { mutate } = useSWRConfig();
    const { createFetch } = useCommonApiFetch(option ?? {});

    const toJsonBlob = (value: unknown) => {
      const valueJson = JSON.stringify(value);
      const jsonBlob = new Blob([valueJson], { type: "application/json" });
      return jsonBlob;
    };
    const generateBody = (arg: unknown) => {
      if (contentTypeRaw === "application/json") {
        return JSON.stringify(arg);
      }
      if (contentTypeRaw === "multipart/form-data") {
        // 全項目を Blob として送信。
        // Blob でない値がある場合は、一律 `application/json` に変換する。
        const body = new FormData();
        Object.entries(arg ?? {})
          .forEach(([key, value]) => {

            if (value === undefined) return;
            if (value instanceof Blob) return body.append(key, value);
            if (Array.isArray(value)) {
              const nonBlobs
                = value.filter((value) => {
                  if (value instanceof Blob) {
                    body.append(key, value);
                    return false;
                  }
                  return true;
                });
              if (nonBlobs.length === 0) return;
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
    const fetcher = (args: UseApiKeys, { arg }: { arg: unknown }) => {
      const {
        path: pathTemplate,
        placeholder: placeholderMap,
        query: queryMapRaw,
      } = args;
      const queryMap = (
        method === "get"
          ? getDefinedQueriesMap(arg as Record<string, unknown>)
          : queryMapRaw
      ) as Record<string, unknown>;
      const path = getPathFromTemplateAndPlaceholderMap(pathTemplate, placeholderMap);
      const url = getUrlFromPathAndQueryMap(path, queryMap);
      const body = (method === "get" ? undefined : generateBody(arg)) as RequestInit["body"];
      console.log(`useSWRMutation by ${url} [${JSON.stringify(args)}] ${JSON.stringify(arg)}`);
      return createFetch(
        fetch(`${apiBaseUrl}${url}`, {
          method: method.toString(),
          headers: {
            ...contentTypeObj,
          },
          body,
        })
          .then(fetchResponseHandler(responseAs)),
      )
        .then((it) => {
          mutate(args);
          return it;
        });
    };
    const placeholder = (option?.placeholder ?? {}) as Record<string, unknown>;
    const keys = FalsyOrFn.map(
      pathTemplate,
      (path) => {
        if (queryOption.unfetchable) return;
        return UseApiKeys.from({
          path,
          placeholder,
          query: getDefinedQueriesMap(queryOption.get),
        });
      },
    );

    return useSWRMutation<Response, Error, FalsyOrFn<UseApiKeys>, Body, Response>(
      keys,
      fetcher,
      {
        onError: (err, key) => {
          const mapper = option?.snwErrorMapper;
          const error = err as unknown as ApiTypes<"Error">;
          alertSnwError(mapper)(error, {
            swrKey: key,
          });
        },
        ...option as SWRMutationConfiguration<
          Response, Error, FalsyOrFn<UseApiKeys>, Body, Response
        >,
      },
    );
  };

export const useApiConfig = () => {
  const config = useSWRConfig();
  return {
    ...config,
    mutate: config.mutate as unknown as ((mutator: (key: UseApiKeys) => boolean) => void),
  };
};

