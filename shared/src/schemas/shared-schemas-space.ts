import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

const spaceSchema = Type.Object({
  createdAt: Type.Union([
    Type.Date({
      description: 'The date and time the space was created',
    }),
    Type.String({
      description: 'The date and time the space was created',
    }),
  ]),
  spaceID: Type.String({
    description: 'The ID of the space',
  }),
  title: Type.String({
    description: 'The title of the space',
  }),
  userID: Type.String({
    description: 'The ID of the user who created the space',
  }),
});
export type Space = Static<typeof spaceSchema>;

export const postSpaceBodySchema = Type.Object({
  title: Type.Optional(
    Type.String({
      description: 'The title of the space',
      minLength: 1,
    }),
  ),
});
export type PostSpaceBody = Static<typeof postSpaceBodySchema>;
export const postSpaceResponseSchema = spaceSchema;

export const listSpacesResponseSchema = Type.Array(spaceSchema);
export type ListSpacesResponse = Static<typeof listSpacesResponseSchema>;
