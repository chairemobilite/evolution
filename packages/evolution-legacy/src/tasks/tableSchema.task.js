/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const knex = require('knex')(require('../../knexfile'));

const tableName = process.argv[2];

knex.table(tableName).columnInfo().then(function(columns) {
  
  console.log(Object.keys(columns));
  console.log(columns);

  process.exit();
});