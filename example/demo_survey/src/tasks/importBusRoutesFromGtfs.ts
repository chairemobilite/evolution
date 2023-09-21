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
import _camelCase from 'lodash/camelCase';

const agenciesOutputGeojsonFilePath = __dirname + '/../survey/agencies.json';
const outputGeojsonFilePath         = __dirname + '/../survey/busRoutes.geojson';

let agenciesById;
let busRoutesGeojson;

try {
  agenciesById = JSON.parse(fs.readFileSync(agenciesOutputGeojsonFilePath).toString());
} catch (err) {
  agenciesById = {};
}

try {
  busRoutesGeojson = JSON.parse(fs.readFileSync(outputGeojsonFilePath).toString());
} catch (err) {
  busRoutesGeojson = {
    type    : 'FeatureCollection',
    features: []
  };
}

const busRoutesBySlug = {};

busRoutesGeojson.features.forEach(function(busRoute){
  busRoutesBySlug[busRoute.properties.slug] = busRoute;
});


// get gtfs agency file path, read it into string and convert from csv to array of objects:
const agenciesGtfsCsvFilePath = process.argv[2];
const agenciesGtfsCsv         = fs.readFileSync(agenciesGtfsCsvFilePath);
const agencies                = parse(agenciesGtfsCsv, {columns: true});

let singleAgencyId = null;
if (agencies.length === 1)
{
  singleAgencyId = agencies[0].agency_id;
}

agencies.forEach(function(agency) {
  if (agenciesById[agency.agency_id.toString()])
  {
    console.log('-> Updating agency: ' + agency.agency_name);
    
  }
  else
  {
    console.log('-> Adding agency ' + agency.agency_name);
  }
  const acronym = agency.agency_acronym ? agency.agency_acronym.toString() : agency.agency_id.toString();
  agenciesById[agency.agency_id.toString()] = {
    slug   : _camelCase(slugify(acronym)),
    acronym: acronym,
    name   : agency.agency_name
  };
});

// get gtfs route file path, read it into string and convert from csv to array of objects:
const routesGtfsCsvFilePath = process.argv[3];
const routesGtfsCsv         = fs.readFileSync(routesGtfsCsvFilePath);
const routes                = parse(routesGtfsCsv, {columns: true});

// initializing geojson feature collection:
const busRoutes = {
  type    : 'FeatureCollection',
  features: []
} as GeoJSON.FeatureCollection;

// add bus routes and convert to geojson features
let i = 1;
routes.forEach(function(route) {
  const routeShortname = route.route_short_name.toString();
  const routeLongname  = route.route_long_name.toString();
  const agencyId       = route.agency_id ? route.agency_id.toString() : singleAgencyId;
  const agency         = agenciesById[agencyId];
  const routeFullname  = routeShortname + ' ' + routeLongname;
  if (parseInt(route.route_type) === 3 && agency)
  {
    const slug = (agency.slug + '_' + _camelCase(slugify(routeShortname)) + '_' + _camelCase(slugify(routeLongname))).replace('SurReservation','');

    if (busRoutesBySlug[slug])
    {
      console.log(chalk.blue('Updating bus route ' + i + ' • ') + chalk.yellow(routeFullname));
    }
    else
    {
      console.log(chalk.blue('Adding bus route ' + i + ' • ') + chalk.yellow(routeFullname));
    }
    
    busRoutesBySlug[slug] = {
      type: 'Feature',
      properties: {
        slug,
        color             : route.route_color ? '#' + route.route_color : '#196db7',
        agencyId          : agencyId,
        shortname         : routeShortname,
        sortableName      : (!isNaN(parseInt(routeShortname)) ? routeShortname.padStart(6,'0') : routeShortname) + agencyId,
        name              : (agency.acronym + ' ' + routeFullname.replace(agency.acronym, '')).replace(/ +(?= )/g,'').replace(' (sur réservation)', ''),
        internalId        : null
      }
    };

    i++;
  }
  
});

for (const slug in busRoutesBySlug)
{
  const busRoute = busRoutesBySlug[slug];
  busRoutes.features.push(busRoute);
}

busRoutes.features.sort(function(busRoute1: any, busRoute2: any){
  return busRoute1.properties.sortableName - busRoute2.properties.sortableName;
});

// write geojson file (or replace if exists)
fs.writeFile(agenciesOutputGeojsonFilePath, JSON.stringify(agenciesById), {flag: 'w'}, function(err) {
  if (err)
  {
    console.error(chalk.red(err));
  }
  else
  {
    console.log(chalk.green("\nAgencies geojson file saved successfully to path ") + chalk.magenta(agenciesOutputGeojsonFilePath));
  }
});

// write geojson file (or replace if exists)
fs.writeFile(outputGeojsonFilePath, JSON.stringify(busRoutes), {flag: 'w'}, function(err) {
  if (err)
  {
    console.error(chalk.red(err));
  }
  else
  {
    console.log(chalk.green("\nBus routes geojson file saved successfully to path ") + chalk.magenta(outputGeojsonFilePath));
  }
});