import { extractOfficeDocument } from './parser-office.js';
import { unzipDocument } from './parser-unzip.js';

/**
 * Parse a binary stream
 * @param root named parameters
 * @param root.binaryStream a binary stream of a downloaded document
 * @param root.mimeType (optional) the mime type of the document
 * @returns the content of the document
 */
export async function parseDocument({
  binaryStream,
  mimeType,
}: {
  binaryStream: Buffer;
  mimeType: string;
}): Promise<string> {
  switch (mimeType) {
    // Open Office XML
    case 'application/vnd.oasis.opendocument.presentation':
    case 'application/vnd.oasis.opendocument.spreadsheet':
    case 'application/vnd.oasis.opendocument.text': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['content'],
        'Open format document',
      );
      return extractOfficeDocument(mainDocument);
    }

    // OOXML
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['ppt/slides/slide'],
        'PowerPoint',
      );
      return extractOfficeDocument(mainDocument);
    }
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['xl/sharedStrings'],
        'Excel',
      );
      return extractOfficeDocument(mainDocument);
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['word/document'],
        'Word',
      );
      return extractOfficeDocument(mainDocument);
    }

    // raw text
    case 'text/csv':
    case 'text/markdown':
    case 'text/plain': {
      return binaryStream.toString('utf8');
    }

    default: {
      throw new Error('Unsupported document type');
    }
  }
}
