/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require('../config/shared/dotenv.config.js');
const bcrypt    = require('bcryptjs');
const prompt    = require('prompt');

function callPrompt() {
  prompt.start();

  const promptSchema = {
    properties: {
      password: {
        pattern: /^.{8,}$/,
        message: 'Password must have at least 8 characters.',
        hidden: true,
        required: true,
        replace: '*'
      }
    }
  };

  prompt.get(promptSchema, function (err, result) {
    const salt     = bcrypt.genSaltSync(10);
    const password = bcrypt.hashSync(result.password, salt);
    console.log('password hash: ', password);
  });
}

callPrompt();
