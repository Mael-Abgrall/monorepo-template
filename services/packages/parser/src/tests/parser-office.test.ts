// node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// libs
import { expect, test } from 'vitest';

// test functions
import { parseDocument } from '../parser.js';

// Load test documents
const docxPath = path.join(import.meta.dirname, 'sampleFiles', 'test.docx');
const pptxPath = path.join(import.meta.dirname, 'sampleFiles', 'test.pptx');
const xlsxPath = path.join(import.meta.dirname, 'sampleFiles', 'test.xlsx');

const wordDocument = await readFile(docxPath);
const powerPointDocument = await readFile(pptxPath);
const excelDocument = await readFile(xlsxPath);

// Expected outputs
const expectDocxOutput =
  'This is a test document for DocX\nThose two sentences should be present in tests';

const expectPptxOutput =
  'This is a file\nThis sentence should also be in tests\nThis is a second slide\nWith additional text\nand\nA table';

const expectXlsxOutput =
  'This is a test for xlsx this is another column this sentence should also be in the tests This is a second sheet';

test('the parser can extract information from a docx file', async () => {
  const result = await parseDocument({
    binaryStream: wordDocument,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  expect(result).toBe(expectDocxOutput);
});

test('the parser can extract information from a pptx file', async () => {
  const result = await parseDocument({
    binaryStream: powerPointDocument,
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  expect(result.split(/\s+/).join(' ')).toContain(
    expectPptxOutput.split(/\s+/).join(' '),
  );
});

test('the parser can extract information from an xlsx file', async () => {
  const result = await parseDocument({
    binaryStream: excelDocument,
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  expect(result).toBe(expectXlsxOutput);
});
