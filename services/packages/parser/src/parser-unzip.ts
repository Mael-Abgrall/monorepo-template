import type { Unzipped } from 'fflate';
import { unzip, unzipSync } from 'fflate/browser';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('parser-unzip.ts');

/**
 * Unzip and Extract document files from an Office document buffer
 * @param buffer The binary content of the Office document
 * @param filterList The list of substrings to filter files
 * @param documentType The type of Office document
 * @returns The content of the main document as a Uint8Array
 */
export async function unzipDocument(
  buffer: Buffer,
  filterList: string[],
  documentType: string,
): Promise<{ [key: string]: Uint8Array }> {
  try {
    const zipFiles: Unzipped = await new Promise((resolve, reject) => {
      unzip(new Uint8Array(buffer), (error, files) => {
        // todo: test this
        /* v8 ignore start -- do later */
        if (error) {
          reject(error);
        } else {
          resolve(files);
        }
        /* v8 ignore end */
      });
    });

    const matchedFiles = filterFiles(zipFiles, filterList);

    if (Object.keys(matchedFiles).length === 0) {
      throw new Error(
        `Unable to extract ${documentType} document from the stream`,
      );
    }

    return matchedFiles;
  } catch {
    logger.warn(
      'Unable to unzip document using async method, falling back to sync method',
    );
    // in very rare instances, the async unzip fails due to Worker being not available on cloudflare workers (see https://github.com/101arrowz/fflate#browser-support)
    const zipFiles = unzipSync(new Uint8Array(buffer));

    const matchedFiles = filterFiles(zipFiles, filterList);

    if (Object.keys(matchedFiles).length === 0) {
      throw new Error(
        `Unable to extract ${documentType} document from the stream`,
      );
    }

    return matchedFiles;
  }
}

/**
 * Filter files in the zip based on a list of substrings
 * @param zipFiles List of files in the zip
 * @param filterList List of substrings to filter the files
 * @returns An array of matched files
 */
function filterFiles(
  zipFiles: { [key: string]: Uint8Array },
  filterList: string[],
): { [key: string]: Uint8Array } {
  const matchedFiles: { [key: string]: Uint8Array } = {};

  for (const fileName of Object.keys(zipFiles)) {
    if (
      filterList.some((filter) => {
        return fileName.includes(filter);
      })
    ) {
      matchedFiles[fileName] = zipFiles[fileName];
    }
  }

  return matchedFiles;
}
