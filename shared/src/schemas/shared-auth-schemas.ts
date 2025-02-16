import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const oauthFinishBodySchema = Type.Object({
  code: Type.String(),
  stateFromUrl: Type.String(),
  vendor: Type.Union([
    Type.Literal('google'),
    Type.Literal('microsoft'),
    Type.Literal('apple'),
  ]),
});
export type OauthFinishBody = Static<typeof oauthFinishBodySchema>;

export const oauthInitQuerySchema = Type.Object({
  vendor: Type.Union([
    Type.Literal('google'),
    Type.Literal('microsoft'),
    Type.Literal('apple'),
  ]),
});
export type OauthInitQuery = Static<typeof oauthInitQuerySchema>;
