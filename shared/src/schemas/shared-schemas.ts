import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const genericResponseSchema = Type.Object({
  message: Type.String(),
});

export type GenericResponse = Static<typeof genericResponseSchema>;
