import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const oauthFinishBodySchema = Type.Object({
  code: Type.String(),
  stateFromUrl: Type.String(),
  vendor: Type.Union([Type.Literal('google'), Type.Literal('microsoft')]),
});
export type OauthFinishBody = Static<typeof oauthFinishBodySchema>;

export const oauthInitQuerySchema = Type.Object({
  vendor: Type.Union([Type.Literal('google'), Type.Literal('microsoft')]),
});
export type OauthInitQuery = Static<typeof oauthInitQuerySchema>;

export const otpInitBodySchema = Type.Object({
  email: Type.String(),
});
export type OtpInitBody = Static<typeof otpInitBodySchema>;

export const otpFinishBodySchema = Type.Object({
  token: Type.String(),
});
export type OtpFinishBody = Static<typeof otpFinishBodySchema>;
