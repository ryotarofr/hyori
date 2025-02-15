import React, { ReactNode } from "react";
type TabIndexContextProps = {
    current: number;
};
export declare const TabIndexProvider: ({ prev: prevFromProps, children, }: {
    prev?: number;
    children: ReactNode;
}) => React.JSX.Element;
export declare const useTabIndex: () => TabIndexContextProps;
export {};
//# sourceMappingURL=TabIndexContext.d.ts.map