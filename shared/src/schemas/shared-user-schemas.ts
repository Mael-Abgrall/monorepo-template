import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const getMeResponseSchema = Type.Object({
  createdAt: Type.Date(),
  email: Type.String(),
  id: Type.String(),
  lastActivity: Type.Date(),
  updatedAt: Type.Date(),
});
export type GetMeResponse = Static<typeof getMeResponseSchema>;
