/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
module.exports = {
  ...require('../../configs/base.prettierrc'),
  // FIXME Move to the base config when we agree on it.
  overrides: [
    {
      files: ['**/__tests__/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
      options: {
        // For test files, we allow longer lines and do not break objects (e.g. expected values) into multiple lines
        printWidth: 150,
        objectWrap: 'collapse'
      }
    }
  ]
}
