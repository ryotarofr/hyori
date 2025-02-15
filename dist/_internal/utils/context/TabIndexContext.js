import React, { createContext, useContext, } from "react";
/**
 * フォーカス情報[取得,保持] コンテキスト
 */
const TabIndexContext = createContext({
    current: 0,
});
export const TabIndexProvider = ({ prev: prevFromProps, children, }) => {
    const { current: prevFromContext } = useTabIndex();
    const prev = prevFromProps ?? prevFromContext;
    const current = prev + 1;
    return (React.createElement(TabIndexContext.Provider, { value: {
            current,
        } }, children));
};
export const useTabIndex = () => useContext(TabIndexContext);
