import { EmptyObject } from "./EmptyObject";

export type ToRecord<
  Key extends PropertyKey,
  T,
  WhenOptional = EmptyObject
> =
[T] extends [never]
  ? { [K in Key]?: WhenOptional }
  : { [K in Key]: T };

export type ToOptionalRecord<
  Key extends PropertyKey,
  T,
  WhenOptional = EmptyObject
> =
[T] extends [never]
  ? { [K in Key]?: WhenOptional }
  : { [K in Key]?: T };
