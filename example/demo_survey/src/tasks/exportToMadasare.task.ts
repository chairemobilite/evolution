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

const exportFileDirectory     = __dirname + '/../exports/madasare_' + moment().format('YYYY-MM-DD_HHmmSS');
const exportJsonFileDirectory = __dirname + '/../exports/json_' + moment().format('YYYY-MM-DD_HHmmSS');
const prefix              = '__madasare2018__';
const createDirectoryIfNotExists = function(absoluteDirectoryPath) {
  if (!fs.existsSync(absoluteDirectoryPath))
  {
    fs.mkdirSync(absoluteDirectoryPath);
  }
};
createDirectoryIfNotExists(exportFileDirectory);
createDirectoryIfNotExists(exportJsonFileDirectory);

let glo_domicCsv        = "";
let glo_persCsv         = "";
let glo_localCsv        = "";
let glo_deplac_somCsv   = "";
let glo_deplac_localCsv = "";
let glo_deplac_modeCsv  = "";

const headers = {
  glo_domic       : true,
  glo_pers        : true,
  glo_local       : true,
  glo_deplac_som  : true,
  glo_deplac_local: true,
  glo_deplac_mode: true
}

const exportValidAndCompletedInterviews = function() { return knex.select('id', 'uuid', 'validated_data')
  .from('sv_interviews')
  .whereRaw(`is_valid IS TRUE AND is_completed IS TRUE AND is_validated IS TRUE`)
  .orderBy('id')
  .then(function(rows) {
    for (let i = 0, count = rows.length; i < count;  i++)
    {
      
      const interview     = rows[i];
      const validatedData = interview.validated_data;
      const glo_domic     = validatedData.household[prefix + "glo_domic"];

      if (moment(validatedData.tripsDate) <= moment('2018-12-21') && (!validatedData.accessCode || (validatedData.accessCode && !validatedData.accessCode.endsWith('?'))))
      {
        glo_domic.uuid      = interview.uuid;
        glo_domic.codeacces = validatedData.accessCode;
        glo_domicCsv       += json2csv(glo_domic, {header: headers.glo_domic}) + "\n";
        headers.glo_domic   = false;
        
        const glo_local    = validatedData.household[prefix + "home__glo_local"];
        glo_localCsv      += json2csv(glo_local, {header: headers.glo_local}) + "\n";
        headers.glo_local  = false;

        const personsArray = Object.values(validatedData.household.persons).sort((personA: any, personB: any) => {
          return personA['_sequence'] - personB['_sequence'];
        });

        for (let personI = 0, personsCount = personsArray.length; personI < personsCount; personI++)
        {
          const person: any     = personsArray[personI];
          const glo_pers   = person[prefix + "glo_pers"];
          glo_pers.uuid    = person._uuid;
          glo_persCsv     += json2csv(glo_pers, {header: headers.glo_pers}) + "\n";
          headers.glo_pers = false;

          if (person[prefix + "usual_place__glo_local"])
          {
            const glo_local   = person[prefix + "usual_place__glo_local"];
            glo_local.gener   = glo_local.gener.replace('"', '').replace(',', ' ').replace(';', ' '); // be safe for csv
            glo_localCsv     += json2csv(glo_local, {header: headers.glo_local}) + "\n";
            headers.glo_local = false;
          }

          if (person.visitedPlaces)
          {
            const visitedPlacesArray = Object.values(person.visitedPlaces).sort((visitedPlaceA: any, visitedPlaceB:any) => {
              return visitedPlaceA['_sequence'] - visitedPlaceB['_sequence'];
            });

            for (let visitedPlaceI = 0, visitedPlacesCount = visitedPlacesArray.length; visitedPlaceI < visitedPlacesCount; visitedPlaceI++)
            {
              const visitedPlace: any = visitedPlacesArray[visitedPlaceI];
              const glo_local    = visitedPlace[prefix + "glo_local"];
              if (glo_local)
              {
                glo_local.gener    = glo_local.gener.replace('"', '').replace(',', ' ').replace(';', ' '); // be safe for csv
                glo_localCsv      += json2csv(glo_local, {header: headers.glo_local}) + "\n";
                headers.glo_local  = false;
              }
            }
          }

          if (person.trips)
          {
            const tripsArray = Object.values(person.trips).sort((tripA: any, tripB: any) => {
              return tripA['_sequence'] - tripB['_sequence'];
            });

            for (let tripI = 0, tripsCount = tripsArray.length; tripI < tripsCount; tripI++)
            {
              const trip: any      = tripsArray[tripI];
              const glo_deplac_som = trip[prefix + "glo_deplac_som"];
              if (glo_deplac_som)
              {
                glo_deplac_somCsv      += json2csv(glo_deplac_som, {header: headers.glo_deplac_som}) + "\n";
                headers.glo_deplac_som  = false;
              }
              const origin__glo_deplac_local = trip[prefix + "origin__glo_deplac_local"];
              if (origin__glo_deplac_local)
              {
                glo_deplac_localCsv      += json2csv(origin__glo_deplac_local, {header: headers.glo_deplac_local}) + "\n";
                headers.glo_deplac_local  = false;
              }
              const destination__glo_deplac_local = trip[prefix + "destination__glo_deplac_local"];
              if (destination__glo_deplac_local)
              {
                glo_deplac_localCsv      += json2csv(destination__glo_deplac_local, {header: headers.glo_deplac_local}) + "\n";
                headers.glo_deplac_local  = false;
              }
              const junction__glo_deplac_local = trip[prefix + "junction__glo_deplac_local"];
              if (junction__glo_deplac_local)
              {
                glo_deplac_localCsv      += json2csv(junction__glo_deplac_local, {header: headers.glo_deplac_local}) + "\n";
                headers.glo_deplac_local  = false;
              }
              const junction__glo_local = trip[prefix + "junction__glo_local"];
              if (junction__glo_local)
              {
                glo_localCsv      += json2csv(junction__glo_local, {header: headers.glo_local}) + "\n";
                headers.glo_local  = false;
              }
              const segments__glo_deplac_mode = trip[prefix + "segments__glo_deplac_mode"];
              if (segments__glo_deplac_mode && segments__glo_deplac_mode.length > 0)
              {
                for (let segmentI = 0, segmentsCount = segments__glo_deplac_mode.length; segmentI < segmentsCount; segmentI++)
                {
                  const glo_deplac_mode = segments__glo_deplac_mode[segmentI];
                  glo_deplac_modeCsv += json2csv(glo_deplac_mode, {header: headers.glo_deplac_mode}) + "\n";
                  headers.glo_deplac_mode  = false;
                }
              }
            }
          }

        }
      }

      fs.writeFileSync(exportJsonFileDirectory + '/' + (validatedData.accessCode || glo_domic.feuillet) + '_' + interview.uuid + '.json', JSON.stringify(validatedData));

    }
    fs.writeFileSync(exportFileDirectory + '/glo_domic.csv', glo_domicCsv);
    fs.writeFileSync(exportFileDirectory + '/glo_pers.csv', glo_persCsv);
    fs.writeFileSync(exportFileDirectory + '/glo_local.csv', glo_localCsv);
    fs.writeFileSync(exportFileDirectory + '/glo_deplac_som.csv', glo_deplac_somCsv);
    fs.writeFileSync(exportFileDirectory + '/glo_deplac_local.csv', glo_deplac_localCsv);
    fs.writeFileSync(exportFileDirectory + '/glo_deplac_mode.csv', glo_deplac_modeCsv);
    process.exit();
  });
};

exportValidAndCompletedInterviews();
