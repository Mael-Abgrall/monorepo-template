import type { Environment } from 'service-utils/environment';
import type {
  ListDocumentsResponse,
  UploadDocumentsResponse,
} from 'shared/schemas/shared-schemas-documents';
import { addDocument, getDocumentsBySpaceID } from 'core/documents';
import { spaceExists } from 'core/space';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import { HTTPException } from 'hono/http-exception';
import { getMimeType } from 'shared/files';
import { errorSchema } from 'shared/schemas/shared-schemas';
import {
  listDocumentsParametersSchema,
  listDocumentsResponseSchema,
  uploadDocumentsResponseSchema,
} from 'shared/schemas/shared-schemas-documents';
import type { Variables } from '../context';
import { validateResponse } from '../helpers/api-helpers-response-validator';
import { authMiddleware } from '../middleware/api-middleware-auth';

const documentsRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

documentsRouter.use(authMiddleware);

const maxFileSize = 100 * 1024 * 1024; // 100MB

documentsRouter.post(
  'upload',
  describeRoute({
    description: `Upload a document, making it available for search in the space. Max file size: ${maxFileSize / 1024 / 1024}MB.

Note: do not put the headers for multipart form data, or the server will not be able to parse the body
`,
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            properties: {
              file: {
                format: 'binary',
                type: 'string',
              },
              spaceID: {
                description:
                  'A valid space ID where the document will be stored',
                type: 'string',
              },
            },
            required: ['file', 'spaceID'],
            type: 'object',
          },
        },
      },
      required: true,
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: uploadDocumentsResponseSchema,
          },
        },
        description: 'The document created in the DB',
      },
      400: {
        content: {
          'application/json': {
            schema: errorSchema,
          },
        },
        description: 'Invalid request body',
      },
      401: {
        content: {
          'application/json': {
            schema: errorSchema,
          },
        },
        description: 'Unauthorized',
      },
      413: {
        content: {
          'application/json': {
            schema: errorSchema,
          },
        },
        description: `The file is too large (max size: ${maxFileSize / (1024 * 1024)}MB)`,
      },
      415: {
        content: {
          'application/json': {
            schema: errorSchema,
          },
        },
        description: 'Unsupported media type',
      },
    },
    tags: ['documents'],
    validateResponse: true,
  }),
  async (context) => {
    const body = await context.req.parseBody();

    /*
    if the File is loaded to memory, and we need to swap to pure streaming, this is the way:
    let bytesReceived = 0;

    const body = context.req.raw.body;
    const stream = body;

    if (!stream) {
      return context.json({ error: 'Missing request body' }, 400);
    }

    for await (const chunk of stream) {
      const textChunk = new TextDecoder().decode(chunk);
      documentsLogger.debug('\n\nReceived chunk:');
      documentsLogger.debug(JSON.stringify(textChunk));
      documentsLogger.debug({ chunkSize: chunk.length }, 'Chunk size');
      bytesReceived += chunk.length;

      if (bytesReceived > maxFileSize) {
        return context.json(
          { error: 'File size exceeds maximum limit of 50MB' },
          413,
        );
      }
    }
    */
    const file = body.file;
    if (!file || !(file instanceof File)) {
      throw new HTTPException(400, {
        message: 'No file provided or invalid file format',
      });
    }
    if (file.size > maxFileSize) {
      throw new HTTPException(413, {
        message: `File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`,
      });
    }
    const mimeType = await getMimeType({ documentName: file.name });
    if (!mimeType) {
      throw new HTTPException(415, {
        message: 'File type not supported',
      });
    }
    if (!body.spaceID || typeof body.spaceID !== 'string') {
      throw new HTTPException(400, {
        message: 'Space ID is required',
      });
    }
    if (
      !(await spaceExists({
        spaceID: body.spaceID,
        userID: context.get('userID'),
      }))
    ) {
      throw new HTTPException(422, {
        message: 'Space does not exist',
      });
    }

    const data = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    const savedDocument = await addDocument({
      binaryStream: data,
      documentID: crypto.randomUUID(),
      mimeType,
      spaceID: body.spaceID,
      title: file.name,
      userID: context.get('userID'),
    });
    if (!savedDocument) {
      throw new HTTPException(500, {
        message: 'Failed to save document',
      });
    }

    return context.json(
      validateResponse({
        response: savedDocument satisfies UploadDocumentsResponse,
        schema: uploadDocumentsResponseSchema,
      }),
    );
  },
);

documentsRouter.get(
  'list/:spaceID',
  describeRoute({
    description: 'Get a list of documents associated to a space',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: listDocumentsParametersSchema,
          },
        },
        description: 'The list of documents',
      },
    },
    tags: ['documents'],
  }),
  validator('param', listDocumentsParametersSchema),
  async (context) => {
    const { spaceID } = context.req.valid('param');
    const documents = await getDocumentsBySpaceID({
      spaceID,
      userID: context.get('userID'),
    });
    return context.json(
      validateResponse({
        response: documents satisfies ListDocumentsResponse,
        schema: listDocumentsResponseSchema,
      }),
    );
  },
);

export { documentsRouter };
