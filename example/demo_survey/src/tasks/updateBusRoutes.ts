/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import fs from 'fs';
import chalk from 'chalk';

const outputGeojsonFilePath: string = __dirname + '/../survey/busRoutes.geojson';

let busRoutesGeojson;

const allSortableNames: string[] = [];
const allSlugs: string[] = [];

try {
  busRoutesGeojson = JSON.parse(fs.readFileSync(outputGeojsonFilePath).toString());
} catch (err) {
  busRoutesGeojson = {
    type    : 'FeatureCollection',
    features: []
  };
}


for (let i = 0, count = busRoutesGeojson.features.length; i < count; i++)
{
  const route                   = busRoutesGeojson.features[i];
  let modifiedAgencyId          = route.properties.agencyId;
  if (route.properties.agencyId === 'STM')
  {
    modifiedAgencyId = 'aaa' + route.properties.agencyId;
  }
  else if (route.properties.agencyId === 'RTL') {
    modifiedAgencyId = 'aa' + route.properties.agencyId;
  }
  else if (route.properties.agencyId === 'STL') {
    modifiedAgencyId = 'a' + route.properties.agencyId;
  }
  modifiedAgencyId = modifiedAgencyId.toLowerCase();
  const sortableName = (route.properties.shortname.length <= 5 ? route.properties.shortname.padStart(6,'0') : route.properties.shortname) + modifiedAgencyId;
  route.properties.sortableName = allSortableNames.indexOf(sortableName) > -1 ? sortableName + "_" : sortableName;
  if (allSlugs.indexOf(route.properties.slug) > -1)
  {
    console.log("\n\nERROR DUPLICATE SLUG FOR", route.properties.slug);
  }
  allSortableNames.push(route.properties.sortableName);
  allSlugs.push(route.properties.slug);
  console.log(chalk.blue('Updating bus route ' + i + ' • ') + chalk.yellow(route.properties.name) + ' with sortableName= ' + route.properties.sortableName);
}



busRoutesGeojson.features.sort(function(routeA, routeB){
  if(routeA.properties.sortableName < routeB.properties.sortableName) return -1;
  if(routeA.properties.sortableName > routeB.properties.sortableName) return 1;
  return 0;
});

// write geojson file (or replace if exists)
fs.writeFile(outputGeojsonFilePath, JSON.stringify(busRoutesGeojson), {flag: 'w'}, function(err) {
  if (err)
  {
    console.error(chalk.red(err));
  }
  else
  {
    console.log(chalk.green("\nBus routes geojson file saved successfully to path ") + chalk.magenta(outputGeojsonFilePath));
  }
});