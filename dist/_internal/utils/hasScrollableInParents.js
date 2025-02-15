export const hasScrollableInParents = (element) => {
    let it = element;
    while (it && it.tagName !== "BODY" && !isScrollable(it)) {
        it = it?.parentElement;
    }
    return it?.tagName !== "BODY";
};
const isScrollable = (element) => element.scrollWidth !== element.clientWidth
    || element.scrollHeight !== element.clientHeight;
