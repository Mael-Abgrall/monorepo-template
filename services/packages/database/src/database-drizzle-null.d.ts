export type NullToUndefined<T> = {
  [K in keyof T]: T[K] extends null
    ? undefined
    : T[K] extends (infer U)[]
      ? NullToUndefined<U>[]
      : ([null] extends [T[K]] ? undefined : never) | Exclude<T[K], null>;
};
