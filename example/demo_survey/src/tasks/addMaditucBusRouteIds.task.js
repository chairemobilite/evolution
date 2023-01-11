/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const fs        = require('fs');
const chalk     = require('chalk');

const outputGeojsonFilePath = __dirname + '/../survey/busRoutes.geojson';

let busRoutesGeojson;

busRoutesGeojson = JSON.parse(fs.readFileSync(outputGeojsonFilePath));

for (let i = 0, count = busRoutesGeojson.features.length; i < count; i++)
{
  const route = busRoutesGeojson.features[i];
  if (route.properties.agencyId === 'STM')
  {
    const lineMin = 0;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'STL')
  {
    const lineMin = 4000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'RTL')
  {
    const lineMin = 3000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '8'));
  }
  else if (route.properties.agencyId === 'CRTL')
  {
    const lineMin = 86000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'CITCRC')
  {
    const lineMin = 74000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else if (route.properties.agencyId === 'CITHSL')
  {
    const lineMin = 79000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'CITLA')
  {
    const lineMin = 80000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else if (route.properties.agencyId === 'CITLR')
  {
    const lineMin = 75000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else if (route.properties.agencyId === 'CITPI')
  {
    const lineMin = 77000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'CITROUS')
  {
    const lineMin = 76000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else if (route.properties.agencyId === 'CITSO')
  {
    const lineMin = 77500;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'CITSV')
  {
    const lineMin = 70000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'CITVR')
  {
    const lineMin = 73000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9').replace('B', '6').replace('M', '7'));
  }
  else if (route.properties.agencyId === 'MRC2M')
  {
    const lineMin = 80300;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname);
  }
  else if (route.properties.agencyId === 'MRCLASSO')
  {
    const lineMin = 87000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else if (route.properties.agencyId === 'MRCLM')
  {
    const lineMin = 84000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9').replace('EXP', '8').replace('B', '1').replace('C', '2').replace('G', '3').replace('H', '4').replace('M', '5').replace('R', '6'));
  }
  else if (route.properties.agencyId === 'OMITSJU')
  {
    const lineMin = 71000;
    route.properties.internalId = lineMin + parseInt(route.properties.shortname.replace('T', '9'));
  }
  else
  {
    route.properties.internalId = null;
  }

}


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