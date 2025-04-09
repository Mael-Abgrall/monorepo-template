import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, describe, expect, it } from 'vitest';
import { downloadBlob, uploadBlob } from '../../database-documents-blob';

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

// describe('upload bob', async () => {
//   it('should upload a blob', async () => {
//     await uploadBlob({
//       data: Buffer.from('bob'),
//       documentID: 'bob',
//       mimeType: 'text/plain',
//     });

//     expect(true).toBeTruthy();
//   });
// });

describe('download blob', () => {
  it('should download a blob', async () => {
    const blob = await downloadBlob({
      documentID: 'test.txt',
    });

    expect(blob.data.toString()).toBe('bob');
  }, 50_000);
});
