/**
 * 環境ごとの定数
 * ・環境変数より取得した値を反映します。
 * ・新しい環境変数を追加する場合、dockerstartup.sh に取得する環境変数を追加して下さい。
 */
export const environment = {
  appContext: (window as any).APP_CONTEXT ?? "",
  apiVer: (window as any).API_VER ?? "/api/v1",
};
