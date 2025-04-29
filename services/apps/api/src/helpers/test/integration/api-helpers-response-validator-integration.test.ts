import { Type } from 'shared/typebox';
import { describe, expect, it } from 'vitest';
import { validateResponse } from '../../api-helpers-response-validator';

describe('validateResponse', () => {
  it('Should return the response if it is valid', () => {
    const response = validateResponse({
      response: { name: 'John' },
      schema: Type.Object({ name: Type.String() }),
    });
    expect(response).toEqual({ name: 'John' });
  });

  it('Should throw an error if the response is invalid', () => {
    expect(() => {
      return validateResponse({
        response: { name: 1 },
        schema: Type.Object({ name: Type.String() }),
      });
    }).toThrow();
  });
});
