/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
const json2csv = require('json2csv').parse;
const moment   = require('moment');
const fs       = require('fs');

const exportJsonFileDirectory = __dirname + '/../exports/json_all_' + moment().format('YYYY-MM-DD_HHmmSS');
const prefix              = '__madasare2018__';
const createDirectoryIfNotExists = function(absoluteDirectoryPath) {
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    fs.mkdirSync(absoluteDirectoryPath);
  }
};
createDirectoryIfNotExists(exportJsonFileDirectory);

const exportValidInterviews = function() { return knex.select('id', 'uuid', 'responses')
  .from('sv_interviews')
  .whereRaw(`is_valid IS TRUE`)
  .orderBy('id')
  .then(function(rows) {
    for (let i = 0, count = rows.length; i < count;  i++)
    {
      
      const interview = rows[i];
      const responses = interview.responses || {accessCode: null};
      const glo_domic = responses.household ? responses.household[prefix + "glo_domic"] : {feuillet: null};

      fs.writeFileSync(exportJsonFileDirectory + '/' + (responses.accessCode || (glo_domic ? glo_domic.feuillet : null)) + '_' + interview.uuid + '.json', JSON.stringify(responses));

    }
    process.exit();
  });
};

exportValidInterviews();
