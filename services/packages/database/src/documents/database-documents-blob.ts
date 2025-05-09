import { AwsClient } from 'aws4fetch';
import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('database-documents-blob.ts');

/**
 * Delete a blob
 * @param root - named parameters
 * @param root.documentID - the document ID
 * @param root.userID - the owner ID
 * @throws if the delete fails
 */
export async function deleteBlob({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<void> {
  logger.info({ documentID }, 'Deleting blob');

  const bucketClient = getClient();

  const response = await bucketClient.fetch(
    `${environment.BLOB_URL}/${selectBucket()}/${userID}/${documentID}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Delete failed with status: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  logger.info({ documentID }, 'Blob deleted successfully');
}

/**
 * Get a blob as a stream
 * @param root - named parameters
 * @param root.documentID - the document ID
 * @param root.userID - the owner ID
 * @throws if the download fails
 * @returns the blob as a Buffer and it's mime type, or undefined if not found
 */
export async function downloadBlob({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<{ data: Buffer; mimeType: string }> {
  logger.info({ documentID }, 'Downloading blob');
  const bucketClient = getClient();

  const response = await bucketClient.fetch(
    `${environment.BLOB_URL}/${selectBucket()}/${userID}/${documentID}`,
  );

  if (response.status === 404 || !response.ok) {
    throw new Error(
      `Download failed with status: ${response.status} ${response.statusText}`,
    );
  }

  /* v8 ignore start -- This should not happen and will be thrown later by the parser */
  const mimeType =
    response.headers.get('content-type') ?? 'application/octet-stream';
  /* v8 ignore end */

  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  logger.info(
    { documentID, size: data.length },
    'Blob downloaded successfully',
  );
  return { data, mimeType };
}

/**
 * Generates a pre-signed URL for downloading a blob externally.
 * This function does not verify the document exist.
 *
 * **Note _be extra careful who get this url_!**
 * @param params The parameters for generating the signed URL.
 * @param params.documentID The ID of the document.
 * @param params.userID The ID of the user.
 * @param params.expiresInSeconds The validity duration of the URL in seconds (defaults to 3600).
 * @returns the signed URL
 */
export async function getSignedURL({
  documentID,
  expiresInSeconds = 3600,
  userID,
}: {
  documentID: string;
  expiresInSeconds: number | undefined;
  userID: string;
}): Promise<string> {
  const bucketClient = getClient();

  const response = await bucketClient.sign(
    new Request(
      `${environment.BLOB_URL}/${selectBucket()}/${userID}/${documentID}?X-Amz-Expires=${expiresInSeconds}`,
    ),
    {
      aws: { signQuery: true },
    },
  );
  return response.url.toString();
}

/**
 * Upload a blob
 * @param root - named parameters
 * @param root.data - the blob data
 * @param root.documentID - the document ID
 * @param root.mimeType - the blob mime type
 * @param root.userID - the owner ID
 * @returns boolean indicating if the upload was successful
 */
export async function uploadBlob({
  data,
  documentID,
  mimeType,
  userID,
}: {
  data: Buffer;
  documentID: string;
  mimeType: string;
  userID: string;
}): Promise<boolean> {
  logger.info({ documentID }, 'Uploading blob...');

  try {
    const bucketClient = getClient();

    const response = await bucketClient.fetch(
      `${environment.BLOB_URL}/${selectBucket()}/${userID}/${documentID}`,
      {
        body: data,
        headers: {
          'Content-Type': mimeType,
        },
        method: 'PUT',
      },
    );

    if (!response.ok) {
      throw new Error(
        `Upload failed with status: ${response.status} ${response.statusText} ${await response.text()}`,
      );
    }

    logger.info({ documentID }, 'Blob uploaded successfully');
    return true;
  } catch (error) {
    logger.error({ documentID, error }, 'Failed to upload blob');
    analytics.captureException(error, userID);
    return false;
  }
}

/**
 * Get the client to use
 * @returns the client
 */
function getClient(): AwsClient {
  return new AwsClient({
    accessKeyId: environment.BLOB_ACCESS_KEY_ID,
    region: 'auto',
    secretAccessKey: environment.BLOB_SECRET_KEY,
    service: 's3',
  });
}

/**
 * Select the bucket to use
 * @returns the bucket name
 */
function selectBucket(): string {
  /* v8 ignore start -- for tests only */
  if (environment.NODE_ENV && environment.NODE_ENV === 'test') {
    return 'test';
  }
  // Likely in dev mode
  if (!environment.NODE_ENV && environment.DOMAIN === 'localhost') {
    return 'dev';
  }

  return 'prod';
  /* v8 ignore end */
}
