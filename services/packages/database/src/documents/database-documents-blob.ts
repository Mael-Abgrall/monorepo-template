import type { Storage } from 'unstorage';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';
import { createStorage } from 'unstorage';
import s3Driver from 'unstorage/drivers/s3';
import { AwsClient } from 'aws4fetch';
const logger = getContextLogger('database-documents-blob.ts');

/**
 * Delete a blob
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteBlob({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  blobLogger.info({ documentID }, 'Deleting blob');
  const blockBlobClient = containerClient.getBlockBlobClient(documentID);

  const exists = await blockBlobClient.exists();
  if (exists) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- not Drizzle
    await blockBlobClient.delete();
    blobLogger.info({ documentID }, 'Blob deleted successfully');
  } else {
    blobLogger.info({ documentID }, 'Blob does not exist, skipping deletion');
  }
}

/**
 * Get a blob as a stream
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns the blob as a Buffer stream
 */
export async function downloadBlob({
  documentID,
}: {
  documentID: string;
}): Promise<{ data: Buffer; mimeType: string }> {
  logger.info({ documentID }, 'Downloading blob');

  const blobClient = new AwsClient({
    accessKeyId: environment.BLOB_ACCESS_KEY_ID,
    secretAccessKey: environment.BLOB_SECRET_KEY,
  });
  // const blobBuffer = await blobClient.fetch(environment.BLOB_URL);

  const response = await blobClient.fetch(
    `${environment.BLOB_URL}/test/test.txt`,
  );
  console.log(response.headers.get('content-type'));
  for await (const chunk of response.body) {
    console.log(chunk);
  }

  return { data: undefined, mimeType: undefined };
}

/**
 * Upload a blob
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.data the blob data
 * @param root.mimeType the blob mime type
 */
export async function uploadBlob({
  data,
  documentID,
  mimeType,
}: {
  data: Buffer;
  documentID: string;
  mimeType: string;
}): Promise<void> {
  logger.info({ documentID }, 'Uploading blob...');
  const storage = await initStorage();

  await storage.setItem(documentID, data, { mimeType });
  logger.info({ documentID }, 'Blob uploaded successfully');
}

/**
 * Initialize the storage library
 * @returns the storage client
 */
async function initStorage(): Promise<Storage<Buffer>> {
  const storage = createStorage<Buffer>({
    driver: s3Driver({
      accessKeyId: environment.BLOB_ACCESS_KEY_ID, // Access Key ID
      bucket: 'test',
      endpoint: environment.BLOB_URL,
      region: 'auto',
      secretAccessKey: environment.BLOB_SECRET_KEY, // Secret Access Key
    }),
  });
  return storage;
}
