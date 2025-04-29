import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

const documentSchema = Type.Object(
  {
    documentID: Type.String(),
    spaceID: Type.Optional(Type.String()),
    status: Type.String(),
    title: Type.String(),
    userID: Type.String(),
  },
  {
    additionalProperties: false,
  },
);

export const uploadDocumentsResponseSchema = documentSchema;
export type UploadDocumentsResponse = Static<
  typeof uploadDocumentsResponseSchema
>;

export const listDocumentsParametersSchema = Type.Object({
  spaceID: Type.String({
    description: 'The ID of the space',
  }),
});
export type ListDocumentsParameters = Static<
  typeof listDocumentsParametersSchema
>;
export const listDocumentsResponseSchema = Type.Array(documentSchema, {
  description: 'The list of documents',
});
export type ListDocumentsResponse = Static<typeof listDocumentsResponseSchema>;

export const deleteDocumentParametersSchema = Type.Object({
  documentID: Type.String({
    description: 'The ID of the document',
  }),
});
export type DeleteDocumentParameters = Static<
  typeof deleteDocumentParametersSchema
>;
