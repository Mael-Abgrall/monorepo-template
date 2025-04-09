import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const genericResponseSchema = Type.Object({
  message: Type.String(),
});

export type GenericResponse = Static<typeof genericResponseSchema>;

export const errorSchema = Type.Object({
  error: Type.String(),
});
export type ErrorSchema = Static<typeof errorSchema>;
