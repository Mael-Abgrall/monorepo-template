/**
 * Extract the mime type from the document name
 * @param root named parameters
 * @param root.documentName the full url of the file with the file name
 * @returns the mime type
 * @throws Error if the document type is not supported
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- better DX
export async function getMimeType({ documentName }: { documentName: string }) {
  /* v8 ignore start -- do later */

  // Open Office XML
  if (documentName.endsWith('.odp')) {
    return 'application/vnd.oasis.opendocument.presentation';
  }
  if (documentName.endsWith('.ods')) {
    return 'application/vnd.oasis.opendocument.spreadsheet';
  }
  if (documentName.endsWith('.odt')) {
    return 'application/vnd.oasis.opendocument.text';
  }

  // OOXML
  if (documentName.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (documentName.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (documentName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // raw text
  if (documentName.endsWith('.csv')) {
    return 'text/csv';
  }
  if (documentName.endsWith('.md')) {
    return 'text/markdown';
  }
  if (documentName.endsWith('.txt')) {
    return 'text/plain';
  }

  return undefined;
  /* v8 ignore end */
}
