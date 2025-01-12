export type Falsy<T> = T | null | undefined | false | "";
export const Falsy = {
  get: <T>(falsy: Falsy<T>): T | undefined => !falsy ? undefined : falsy,
};
