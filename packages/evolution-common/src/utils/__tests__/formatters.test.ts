/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { canadianPostalCodeFormatter, eightDigitsAccessCodeFormatter } from '../formatters';

describe('helper', () => {
  describe('eightDigitsAccessCodeFormatter', () => {
    test.each([
      // Test case format: [description, input, expected output]
      ['formats 8 digits as XXXX-XXXX', '12345678', '1234-5678'],
      ['converts existing dashes correctly', '1234-5678', '1234-5678'],
      ['converts underscores to dashes', '1234_5678', '1234-5678'],
      ['removes letters and special characters', 'ab12cd34ef56gh78', '1234-5678'],
      ['handles mixed special characters', '12_34-ab56!78', '1234-5678'],
      ['keeps dashes but removes other special chars', '12-34-56-78', '1234-5678'],
      ['smaller code with dashes', '123-456', '123-456'],
      ['8 digits with dash at the wrong place', '123-45678', '1234-5678'],
      ['does not format if less than 8 digits', '123456', '123456'],
      ['truncates to 9 characters max', '1234567890', '1234-5678'],
      ['handles input with spaces', '1234 5678', '1234-5678'],
      ['handles input with spaces before and after', '   12 34 5678  ', '1234-5678'],
      ['handles empty string', '', ''],
      ['9 characters, but less than 8 digits', '123-45-6-', '1234-56'],
      ['handles with non-numeric at the end', '1234db', '1234'],
      ['partial access code, 1 character', '1', '1'],
      ['partial access code, 2 characters', '12', '12'],
      ['partial access code, 3 characters', '123', '123'],
      ['partial access code, 4 characters', '1234', '1234'],
      // FIXME The dash should remain in the formatted code, but it is not the case currently with the delimiterLazyShow
      ['partial access code, 4 characters + dash', '1234-', '1234-'],
      ['partial access code, 4 characters + dash + 2 characters', '1234-23', '1234-23'],
      ['partial access code, 5 characters', '12345', '12345'],
      ['partial access code, 6 characters', '123456', '123456'],
      ['partial access code, 7 characters', '1234567', '1234567'],
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