import React, {
  ReactNode,
  createContext,
  useContext,
  useState,
} from "react";


import { Modal } from "../../components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { getContextDefaultValueFactory } from "../state/getContextDefaultValueFactory";

const noImpl = getContextDefaultValueFactory("LoadingBoundaryProvider");

type LoadingBoundaryContextProps = {
  track: <T>(promise: Promise<T>) => Promise<T>;
};

export const LoadingBoundaryContext = createContext<LoadingBoundaryContextProps>({
  track: noImpl("track()"),
});

export const LoadingBoundaryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [trackList, setTrackList] = useState<Promise<unknown>[]>([]);
  const loading = 0 < trackList.length;

  const track = <T,>(promise: Promise<T>) => {
    setTrackList((prev) => ([...prev, promise]));
    return promise
      .finally(() =>
        setTrackList((prev) => prev.filter((it) => it !== promise)),
      );
  };

  return (
    <LoadingBoundaryContext.Provider
      value={{
        track,
      }}
    >
      {children}
      <Modal
        opened={loading}
        setOpened={() => { }}
        clickBackdropToClose={false}
        style={{
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") event.preventDefault();
        }}
      >
        <Spinner
          design="ballClipRotatePulse"
        />
        <span>tracking [{trackList.length}] promises...</span>
      </Modal>
    </LoadingBoundaryContext.Provider>
  );
};

export const useLoadingBoundary = () => useContext(LoadingBoundaryContext);
