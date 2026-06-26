/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { accessCodeFormatter, canadianPostalCodeFormatter, eightDigitsAccessCodeFormatter } from '../formatters';
import { getAccessCodeFormat } from '../../services/accessCode/accessCodeFormats';

describe('helper', () => {
  describe('accessCodeFormatter', () => {
    describe.each([
      // Test case format: [description, format name, input, expected output]
      // Dashes are inserted eagerly as soon as a group is complete, letters are upper-cased.
      ['8 digits formats as 0000-0000', '0000-0000', '12345678', '1234-5678'],
      ['8 digits removes letters and special characters', '0000-0000', 'ab12cd34ef56gh78', '1234-5678'],
      ['8 digits truncates extra digits', '0000-0000', '1234567890', '1234-5678'],
      ['8 digits dash inserted once first group is complete', '0000-0000', '123456', '1234-56'],
      ['8 digits partial first group kept as-is', '0000-0000', '123', '123'],
      ['8 digits ignores typed dashes and spaces', '0000-0000', '12-34 5678', '1234-5678'],
      ['8 digits handles empty string', '0000-0000', '', ''],
      ['9 digits formats as 000-000-000', '000-000-000', '123456789', '123-456-789'],
      ['9 digits truncates extra digits', '000-000-000', '1234567890', '123-456-789'],
      ['9 digits dash at the wrong place', '000-000-000', '12-3456789', '123-456-789'],
      ['8 letters formats as ABCD-ABCD upper-cased', 'ABCD-ABCD', 'abcdefgh', 'ABCD-EFGH'],
      ['8 letters drops digits', 'ABCD-ABCD', 'ab12cdef34gh', 'ABCD-EFGH'],
      ['9 letters formats as ABC-ABC-ABC', 'ABC-ABC-ABC', 'abcdefghi', 'ABC-DEF-GHI'],
      ['letters then digits ABCD-0000', 'ABCD-0000', 'abcd1234', 'ABCD-1234'],
      ['letters then digits drops wrong-type chars', 'ABCD-0000', 'ab12cd1234', 'ABCD-1234'],
      ['letters then digits ABC-000-000', 'ABC-000-000', 'abc123456', 'ABC-123-456'],
      ['mixed ABC-000-000 with typed dashes', 'ABC-000-000', 'abc-123-456', 'ABC-123-456'],
    ])('%s: %s => %s', (_, formatName, input, expected) => {
      test('function call with formatter parameter', () => {
        expect(accessCodeFormatter(input, getAccessCodeFormat(formatName as any))).toBe(expected);
      });

      test('using the project configured format as default', async() => {
        await jest.isolateModulesAsync(async () => {
          const { default: projectConfig } = await import('../../config/project.config');
          projectConfig.accessCodeFormat = formatName as any;
          const { accessCodeFormatter } = await import('../formatters');

          expect(accessCodeFormatter(input)).toBe(expected);
        });
      })
    });
  });

  describe('eightDigitsAccessCodeFormatter', () => {
    test.each([
      // Test case format: [description, input, expected output]
      ['formats 8 digits as 0000-0000', '12345678', '1234-5678'],
      ['converts existing dashes correctly', '1234-5678', '1234-5678'],
      ['removes letters and special characters', 'ab12cd34ef56gh78', '1234-5678'],
      ['8 digits with dash at the wrong place', '123-45678', '1234-5678'],
      ['truncates extra digits', '1234567890', '1234-5678'],
      ['handles input with spaces', '1234 5678', '1234-5678'],
      ['handles empty string', '', ''],
      ['dash inserted once first group is complete', '123456', '1234-56'],
      ['partial first group kept as-is', '123', '123'],
    ])('%s: %s => %s', (_, input, expected) => {
      expect(eightDigitsAccessCodeFormatter(input)).toBe(expected);
    });
  });

  describe('canadianPostalCodeFormatter', () => {
    test.each([
      // Test case format: [description, input, expected output]
      ['lower case no space', 'h2e1r3', 'H2E 1R3'],
      ['correctly formatted', 'H2E 1R3', 'H2E 1R3'],
      ['With invalid delimiters', 'H2e-1r3', 'H2E 1R3'],
      ['Many invalid characters', 'h.2.e.1.r.3', 'H2E 1R3'],
      ['all numeric', '123456', '123 456'],
      ['all letters', 'abcdef', 'ABC DEF'],
      ['longer than 7 characters', 'h2e1y6u7r4', 'H2E 1Y6'],
      ['handles input with many spaces', 'h   2 e     1r3', 'H2E 1R3'],
      ['handles input with spaces before and after', '   H2E 1R3  ', 'H2E 1R3'],
      ['handles empty string', '', ''],
      ['partial postal code, 1 character', 'h', 'H'],
      ['partial postal code, 2 characters', 'h2', 'H2'],
      ['partial postal code, 3 characters', 'h2e', 'H2E'],
      ['partial postal code, 4 characters', 'h2e1', 'H2E1'],
      ['partial postal code, 5 characters', 'h2e1r', 'H2E1R'],
      ['partial postal code, 4 characters + space', 'h2e1 ', 'H2E1 '],
    ])('%s: %s => %s', (_, input, expected) => {
      expect(canadianPostalCodeFormatter(input)).toBe(expected);
    });
  });
});