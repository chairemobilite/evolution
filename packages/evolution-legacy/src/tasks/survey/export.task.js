/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const knex     = require('knex')(require('../../../knexfile'));
const moment   = require('moment');
const fs       = require('fs');

const exportJsonFileDirectory = __dirname + '/../../../monitoring/interviews/';
const createDirectoryIfNotExists = function(absoluteDirectoryPath) {
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    fs.mkdirSync(absoluteDirectoryPath);
  }
};
createDirectoryIfNotExists(exportJsonFileDirectory);

const exportInterviews = function() { return knex.select('id', 'uuid', 'responses')
  .from('sv_interviews')
  //.whereRaw(`is_valid IS TRUE AND is_completed IS TRUE AND is_validated IS TRUE`)
  .orderBy('id')
  .then(function(rows) {
    for (let i = 0, count = rows.length; i < count;  i++)
    {
      
      const interview      = rows[i];
      const responses      = interview.responses;
            responses.id   = interview.id;
            responses.uuid = interview.uuid;

      fs.writeFileSync(exportJsonFileDirectory + '/' + interview.id + '__' + interview.uuid + '.json', JSON.stringify(responses));

    }
    process.exit();
  });
};

exportInterviews();
