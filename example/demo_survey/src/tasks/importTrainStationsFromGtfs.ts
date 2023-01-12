/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import chalk from 'chalk';
import slugify from 'slugify';
import _camelCase from 'lodash.camelcase';

const outputGeojsonFilePath = __dirname + '/../survey/trainStations.geojson';

// get gtfs stops file path, read it into string and convert from csv to array of objects:
const stopsGtfsCsvFilePath = process.argv[2];
const stopsGtfsCsv         = fs.readFileSync(stopsGtfsCsvFilePath);
const stops                = parse(stopsGtfsCsv, {columns: true});

// initializing geojson feature collection:
const trainStations: GeoJSON.FeatureCollection = {
  type    : 'FeatureCollection',
  features: []
};

// add train stations and convert to geojson features (train stations have stop code between 10000 and 10999 and empty parent_station)
let i = 1;
const alreadyFoundStopCodes: number[] = [];
stops.forEach(function(stop) {
  const stopCode = parseInt(stop.stop_code);
  if (!alreadyFoundStopCodes.includes(stopCode))
  {
    alreadyFoundStopCodes.push(stopCode);
    const stopName = stop.stop_name.replace('gare ', '');
    console.log(chalk.blue('Adding train station ' + i + ' • ') + chalk.yellow(stopName));

    trainStations.features.push({
      type: 'Feature', 
      properties: {
        shortname: _camelCase(slugify(stopName)),
        code: stop.stop_code,
        name: stopName,
        internalId: stop.stop_id
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)]
      }
    });
    i++;
  }
  
});

// write geojson file (or replace if exists)
fs.writeFile(outputGeojsonFilePath, JSON.stringify(trainStations), {flag: 'w'}, function(err) {
  if (err)
  {
    console.error(chalk.red(err));
  }
  else
  {
    console.log(chalk.green("\nTrain stations geojson file saved successfully to path ") + chalk.magenta(outputGeojsonFilePath));
  }
});