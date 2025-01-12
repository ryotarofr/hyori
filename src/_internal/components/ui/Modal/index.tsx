import clsx from "clsx";
import {
  ComponentPropsWithoutRef,
  ReactNode,
  useEffect,
  useRef,
} from "react";


import { hasScrollableInParents } from "../../../utils/hasScrollableInParents";
import { TabIndex, TabIndexes } from "../../../utils/state/useTabIndexes";
import { Override } from "../../../types/Override";

import styles from "./Modal.module.scss";

let beforeFocusRef: HTMLElement | undefined;

/**
 * モーダル
 */
export const Modal = ({
  tabIndex,
  opened,
  setOpened,
  title,
  titleIcon,
  customCloseButton,
  onTitleIconClick,
  clickBackdropToClose = false,
  children,
  ...wrappedProps
}: Override<
  /** `<dialog />`に渡す */
  Omit<ComponentPropsWithoutRef<"dialog">, "open">,
  {
    tabIndex?: TabIndex<{
      closeIcon: number;
    }>;
    /** trueなら表示 */
    opened: boolean;
    /** 表示state設定関数 */
    setOpened: (opened: boolean) => void;
    /** モーダルタイトル */
    title?: ReactNode;
    /** タイトルアイコン */
    titleIcon?: ReactNode;
    /** タイトルアイコンのクリックイベント */
    onTitleIconClick?: () => void;
    /** カスタム閉じるボタン */
    customCloseButton?: ReactNode;
    /** trueなら、背景をクリックすると閉じる */
    clickBackdropToClose?: boolean;
    /** 子要素 */
    children?: ReactNode;
  }
>): ReactNode => {
  const tabIndexes = TabIndexes.from(tabIndex);
  const ref = useRef<HTMLDialogElement>(null);

  const suppressScroll = (event: Event) => {
    const target = (event.target as HTMLElement);
    if (hasScrollableInParents(target)) return;
    event.preventDefault();
  };

  // 最初のdialogが開かれる前のfocus要素をglobalに保持
  if (!document.activeElement?.closest("dialog")
    && document.activeElement?.tagName !== "DIALOG"
    && document.activeElement !== document.body) {
    beforeFocusRef = document.activeElement as HTMLElement;
  }
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (opened) {
      if (dialog.open) return;
      dialog.showModal();
      dialog.addEventListener("wheel", suppressScroll, { passive: false });
    } else {
      if (dialog.open) {
        dialog.close();
        dialog.removeEventListener("wheel", suppressScroll);
      }
      // 最後の<Modal/>についてここに遷移する限り、フォーカスはdialogを開く前に戻る。
      setTimeout(() => beforeFocusRef?.focus(), 0);
    }
  }, [opened]);

  return (
    <dialog
      {...wrappedProps}
      // https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/tabindex
      // <dialog/> に対しての tabIndex の指定は行ってはいけないとある。
      // が、本システムは正のtabIndexを用いている都合上、開かれたdialogに
      // 自動フォーカスされることによってフォーカスが迷子になることがあるため、
      // 対策として固定値を設定する。
      tabIndex={1}
      ref={ref}
      className={clsx(
        styles.Modal,
        wrappedProps.className,
      )}
      onKeyDown={(event) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        wrappedProps.onKeyDown?.(event);
      }}
      onCancel={(event) => {
        event.preventDefault();
        setOpened(false);
        wrappedProps.onCancel?.(event);
      }}
      onPointerDown={(event) => {
        wrappedProps.onPointerDown?.(event);
        if (!clickBackdropToClose) return;
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const clickedInDialog = (
          rect.top <= event.clientY
          && event.clientY <= rect.top + rect.height
          && rect.left <= event.clientX
          && event.clientX <= rect.left + rect.width
        );
        if (clickedInDialog) return;
        setOpened(false);
      }}
    >
      {title
        && <hgroup
          className={styles.Title}
        >
          <h1>
            {titleIcon && (
              <span
                className={styles.TitleIcon}
                onClick={onTitleIconClick}
                data-clickable={!!onTitleIconClick}
              >
                {titleIcon}
              </span>
            )}
            {title}
          </h1>
          {customCloseButton ? (
            customCloseButton
          ) : (
            <button
              className={styles.CloseButton}
              tabIndex={tabIndexes.closeIcon}
              onClick={() => setOpened(false)}
            />
          )}
        </hgroup>
      }
      {children}
    </dialog>
  );
};
