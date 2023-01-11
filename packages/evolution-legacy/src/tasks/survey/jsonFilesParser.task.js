/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import fs       from 'fs';
import path     from 'path';
import glob     from 'glob';
import util     from 'util';
import Papa     from 'papaparse';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';


import { fileManager }           from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import serviceLocator            from 'chaire-lib-common/lib/utils/ServiceLocator';
import prepareSocketRoutes       from '../../socketRoutes/prepareSocketRoutes';
import loadZoneGeojsonCollection from '../transition/snippets/loadZoneGeojsonCollection';
import loadDataSourceCollection  from '../transition/snippets/loadDataSourceCollection';

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);

const jsonFilesDirectoryPath = process.argv[2];
const results                = {};

const run = async function() {

  prepareSocketRoutes();

  await loadDataSourceCollection(serviceLocator.collectionManager, serviceLocator.eventManager);

  const dataSourceCollection = serviceLocator.collectionManager.get('dataSources');
  const dataSources          = dataSourceCollection.getFeatures();
  const dataSourcesChoices   = dataSources.map(function(dataSource) {
    return {
      name: dataSource.toString(),
      value: dataSource.get('id')
    };
  });

  const answers = await inquirer.prompt([
    {
      type   : 'file-tree-selection',
      name   : 'parserFilePath',
      message: 'Please select the parser (must be placed in the project parsers folder)',
      root   : `projects/${process.env.PROJECT_SHORTNAME}/parsers/`,
      pageSize: 20
    },
    {
      type: 'checkbox',
      name: 'zonesDataSourceIds',
      message: 'Please select the zones data sources to join to interview data',
      choices: dataSourcesChoices
    }
  ]);

  const parser = require(answers.parserFilePath);

  const jsonFiles = await directoryManager.getFilesWithExtensionAbsolute(jsonFilesDirectoryPath, 'json');
  const jsonFilesCount = jsonFiles.length;
  console.log(`found ${jsonFilesCount} json files`);

  const zoneCollections = {};
  for (let i = 0, countI = answers.zonesDataSourceIds.length; i < countI; i++)
  {
    await loadZoneGeojsonCollection(serviceLocator.collectionManager, serviceLocator.eventManager, answers.zonesDataSourceIds[i], `zones_${answers.zonesDataSourceIds[i]}`);
    zoneCollections[answers.zonesDataSourceIds[i]] = serviceLocator.collectionManager.get(`zones_${answers.zonesDataSourceIds[i]}`);
  }

  for (let i = 0; i < jsonFilesCount; i++)
  {
    const jsonFile = jsonFiles[i];
    if (jsonFile.endsWith('_results.json'))
    {
      continue;
    }
    const fileData = JSON.parse(fileManager.readFileAbsolute(jsonFile));
    parser.parse ? parser.parse(fileData, results, zoneCollections, dataSourceCollection) : parser.default(fileData, results, zoneCollections, dataSourceCollection);

    console.log(`${i + 1}/${jsonFilesCount} parsed`);
  }

  const aggregatedResults = parser.aggregate ? parser.aggregate(results, zoneCollections, dataSourceCollection) : results;

  if (aggregatedResults.csv) {
    fileManager.writeFile(`exports/${parser.name ? parser.name : 'parser'}.results.csv`, aggregatedResults.csv);
  }
  if (aggregatedResults.json) {
    fileManager.writeFile(`exports/${parser.name ? parser.name : 'parser'}.results.json`, JSON.stringify(aggregatedResults.json, null, 2));
  }
  else
  {
    fileManager.writeFile(`exports/${parser.name ? parser.name : 'parser'}.results.json`, JSON.stringify(aggregatedResults, null, 2));
  }
  
  return;
};

run().then(function() {
  console.log('complete');
  process.exit();
});