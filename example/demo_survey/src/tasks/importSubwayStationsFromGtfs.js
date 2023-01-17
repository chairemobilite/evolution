/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const parse     = require('csv-parse/lib/sync');
const fs        = require('fs');
const chalk     = require('chalk');
const slugify   = require('slugify');
const _camelCase = require('lodash.camelcase');

const outputGeojsonFilePath = __dirname + '/../survey/subwayStations.geojson';

// get gtfs stops file path, read it into string and convert from csv to array of objects:
const stopsGtfsCsvFilePath = process.argv[2];
const stopsGtfsCsv         = fs.readFileSync(stopsGtfsCsvFilePath);
const stops                = parse(stopsGtfsCsv, {columns: true});

// initializing geojson feature collection:
subwayStations = {
  type    : 'FeatureCollection',
  features: []
};

// add subway stations and convert to geojson features (subway stations have stop code between 10000 and 10999 and empty parent_station)
let i = 1;
stops.forEach(function(stop) {
  const stopCode = parseInt(stop.stop_code);
  if (stop.parent_station === '' && stopCode >= 1000 && stopCode <= 10999 )
  {
    const stopName = stop.stop_name.replace('Station ', '');
    console.log(chalk.blue('Adding station ' + i + ' • ') + chalk.yellow(stopName));

    subwayStations.features.push({
      type: 'Feature', 
		  properties: {
        shortname: _camelCase(slugify(stopName)),
        code: stop.stop_code,
        name: stopName,
        internalId: i
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
fs.writeFile(outputGeojsonFilePath, JSON.stringify(subwayStations), {flag: 'w'}, function(err) {
  if (err)
  {
    console.error(chalk.red(err));
  }
  else
  {
    console.log(chalk.green("\nSubway stations geojson file saved successfully to path ") + chalk.magenta(outputGeojsonFilePath));
  }
});