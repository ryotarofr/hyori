import React, {
  ReactNode,
  createContext,
  useContext,
} from "react";

type TabIndexContextProps = {
  current: number;
};

/**
 * フォーカス情報[取得,保持] コンテキスト
 */
const TabIndexContext = createContext<TabIndexContextProps>({
  current: 0,
});

export const TabIndexProvider = ({
  prev: prevFromProps,
  children,
}: {
  prev?: number;
  children: ReactNode;
}) => {
  const { current: prevFromContext } = useTabIndex();
  const prev = prevFromProps ?? prevFromContext;
  const current = prev + 1;

  return (
    <TabIndexContext.Provider
      value={{
        current,
      }}
    >
      {children}
    </TabIndexContext.Provider>
  );
};

export const useTabIndex = () => useContext(TabIndexContext);
