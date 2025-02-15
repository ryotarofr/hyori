/**
 * コンテキスト
 * @param providerName - コンテキストプロバイダーのコンポーネントタグ名称
 */
export const getContextDefaultValueFactory = (providerName: string) => (memberName: string) =>
  () => { throw new Error(`You must either init <${providerName} /> or impl ${memberName}`); };
