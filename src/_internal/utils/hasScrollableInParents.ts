export const hasScrollableInParents = (element: HTMLElement) => {
  let it: HTMLElement | null = element;
  while(it && it.tagName !== "BODY" && !isScrollable(it)) {
    it = it?.parentElement;
  }
  return it?.tagName !== "BODY";
};

const isScrollable = (element: HTMLElement) =>
  element.scrollWidth !== element.clientWidth
  || element.scrollHeight !== element.clientHeight;
