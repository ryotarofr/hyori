<h1 align="center">hyori</h1>
<div align="center">
    <strong>
    <a href="https://github.com/vercel/swr">`swr`</a> + <a href="https://github.com/openapi-ts/openapi-typescript">`openapi-typescript`</a> api fetch react hooks
    </strong>
</div>
<br />

hyori はデータ取得用の React Hooks ライブラリです。

[SWR](https://swr.vercel.app/) および [SWR Mutation](https://swr.vercel.app/mutation) を使用して RESTful API と対話するためのタイプセーフなインターフェースを提供します。OpenAPI などから生成された API スキーマを活用し、エンドポイント、リクエストパラメーター、レスポンスの型を自動的に導出します。

## 特徴

- **タイプセーフな API 呼び出し**  
  API スキーマに基づいた強力な型付けが行われたエンドポイントおよびレスポンスを提供します。`ApiTypes`、`ApiType`、`ApiQuery` などのユーティリティ型を使用して、正しいデータ利用を強制します。

- **GET および Mutation 用フック**  
  - `useApiQuery`: GET リクエストを実行し、フェッチ、キャッシュ、再検証を自動的に処理します。  
  - `useApiMutation`: GET 以外のリクエスト（例: POST、PUT、PATCH、DELETE）や、GET リクエストの遅延実行に使用します。

- **動的な URL 構築**  
  プレースホルダー付きの URL テンプレートやクエリパラメーターをサポートし、ライブラリが自動的にプレースホルダーを置換して完全な URL を生成します。

- **カスタマイズ可能なローディング＆エラーハンドリング**  
  `setApiLibDeps` を介して、独自のローディングインジケーターやエラーハンドラを注入できます。

- **柔軟なレスポンス処理**  
  デフォルトでは JSON レスポンスをサポートし、ファイルや Blob レスポンスの処理にも対応可能です。

## インストール

プロジェクトに以下の依存関係をインストールしてください:

```bash
npm install hyori
# or
yarn add hyori
# or
pnpm install hyori
```

## セットアップ

API フックを使用する前に、setApiLibDeps 関数を利用して API スキーマおよびカスタム実装（必要に応じて）を注入してください。

```ts
import { setApiLibDeps } from 'hyori';
import { components, paths } from './schema.gen';
import { useMyLoadingBoundary } from './context/MyLoadingBoundary';
import { useMyErrorHandler } from './context/MyErrorHandler';

setApiLibDeps({
  apiSchema: { components, paths },
  useLoadingBoundary: useMyLoadingBoundary,
  useErrorHandler: useMyErrorHandler,
});
```

カスタム実装を提供しない場合、デフォルトの（何もしない）関数がエラー通知やローディングインジケーターとして使用されます。

## GET

useApiQuery フックを使用して GET リクエストを実行します。URL の生成、フェッチ、およびエラー報告を自動的に処理します:

```ts
import { useApiQuery } from 'hyori';

const { data, error } = useApiQuery(
  '/samples/{id}',
  {
    placeholder: { id: '123' },
    query: { page: 1, limit: 10 },
    responseAs: 'json',
    showIndicator: true,
    errorMapper: (error) => `Error: ${error.message}`,
  }
);

if (error) {
  // ...
}

if (!data) {
  // ...
}
```

## Mutation (POST, PUT, PATCH, DELETE)

useApiMutation フックを使用して、GET 以外のリクエストや手動で実行するリクエストを処理します。このフックは、multipart/form-data を利用したファイルアップロードにも対応しています:

```ts
import { useApiMutation } from 'hyori';

const { trigger, data, error } = useApiMutation(
  '/samples',
  'post',
  {
    placeholder: {},
    query: { verbose: true },
    contentType: 'application/json', // または 'multipart/form-data'
    responseAs: 'json',
    showIndicator: true,
    errorMapper: (error) => `Error: ${error.message}`,
  }
);

const handleSubmit = async () => {
  try {
    const response = await trigger({ field1: 'value', field2: 42 });
    console.log('Response:', response);
  } catch (err) {
    // ...
  }
};
```

## グローバル API 設定の利用

グローバルな SWR 設定にアクセスするための useApiConfig フックも提供しています。これにより、キャッシュの手動操作が可能になります:

```ts
import { useApiConfig } from 'hyori';

const { mutate } = useApiConfig();

// 例: API キーに基づいてキャッシュを無効化する場合:
mutate((key) => key.path.includes('/samples'));
```

## API リファレンス

### `setApiLibDeps(deps: { ... })`

カスタム依存関係および API スキーマをライブラリに注入します。

- useLoadingBoundary: ローディングインジケーターのロジックを制御する関数。
- useErrorHandler: エラーハンドリングのロジックを制御する関数。
- apiSchema: 生成された OpenAPI 定義など、API スキーマを指定します。

### `useApiQuery(...)`

SWR と統合した GET リクエストを実行します。
パラメーター:

- pathTemplate: API エンドポイントの URL テンプレート (例: /samples/{id})。
- options: 以下を含むオプションのオブジェクト:
  - placeholder: プレースホルダー名とその値のマッピングオブジェクト。
  - query: クエリパラメーターを返すオブジェクトまたは関数。
  - responseAs: レスポンスの型指定 (json、file、または blob)。
  - showIndicator: フェッチ中にローディングインジケーターを表示するかどうか。
  - errorMapper: エラーメッセージをフォーマットする関数。

戻り値は data、error、mutate などのプロパティを持つ SWR のレスポンスオブジェクトです。

### `useApiMutation(...)`

SWR Mutation を利用して、GET 以外のリクエストや遅延実行の GET リクエストを処理します。

パラメーター:

- pathTemplate: API エンドポイントの URL テンプレート。
- method: HTTP メソッド (例: 'post'、'put'、'patch'、'delete')。
- options: 以下を含むオプションの設定オブジェクト:
  - placeholder: URL のプレースホルダーのマッピングオブジェクト。
  - query: クエリパラメーター。
  - contentType: リクエストの Content-Type ヘッダー。
  - responseAs: 期待するレスポンスのフォーマット。
  - showIndicator: ローディングインジケーターの表示切替。
  - errorMapper: カスタムエラーマッピング関数。

戻り値は以下のオブジェクトです:

- trigger: API 呼び出しを実行する関数。
- data、error: レスポンスデータおよびエラー状態。

### ユーティリティ型

- ApiTypes<Key>: API スキーマの components に定義された型を抽出します。
- ApiType<Url, Method>: 指定したエンドポイントおよび HTTP メソッドに対する型を抽出します。
- ApiQuery<Url, Method>: GET エンドポイントのクエリパラメーターの型を抽出します。

### カスタマイズ

デフォルトのローディングおよびエラーハンドリングの動作を上書きするには、独自のフックを実装し、setApiLibDeps を介して注入してください:

- ローディング境界 (Loading Boundary)
プロミスをラップしてローディングインジケーターを処理する track 関数を返すフックを実装してください。

- エラーハンドラ (Error Handler)
エラーの処理および表示を行う alertSnwError 関数を返すフックを実装してください。

### コントリビュート

バグの報告や改善案がある場合は、Issue を立てるか Pull Request を送信してください。
