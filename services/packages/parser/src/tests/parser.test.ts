// libs
import { describe, expect, test } from 'vitest';

// functions to test
import { parseDocument } from '../parser.js';

describe('parseDocument', async () => {
  test('parseDocument reject unknown documents', async () => {
    await expect(async () => {
      await parseDocument({
        binaryStream: Buffer.from('test'),
        mimeType: 'undefined',
      });
    }).rejects.toThrow('Unsupported document type');
  });
});
