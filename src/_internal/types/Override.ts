export type Override<T, U>
  = U
  & Omit<T, keyof U>
  ;
