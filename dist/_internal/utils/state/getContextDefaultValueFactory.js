/**
 * コンテキスト
 * @param providerName - コンテキストプロバイダーのコンポーネントタグ名称
 */
export const getContextDefaultValueFactory = (providerName) => (memberName) => () => { throw new Error(`You must either init <${providerName} /> or impl ${memberName}`); };
