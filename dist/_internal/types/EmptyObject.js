export const EmptyObject = {
    init: () => ({}),
    is: (it) => it != null && typeof it === "object" && Object.keys(it).length === 0,
};
