/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import moment from 'moment-timezone';
import _get from 'lodash/get';
import { featureEach as turfFeatureEach, booleanPointInPolygon as turfPointInPolygon } from '@turf/turf';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import helper from 'evolution-legacy/lib/helpers/server';
import zonesGeojson from '../../survey/zones.json';
import getTripMultimodeCategory from 'evolution-legacy/lib/helpers/survey/helperFunctions/getTripMultimodeCategory';

const getInvalidInterviewIds = function(lastUpdatedAt) {
  return knex.select('i.id')
  .from('sv_interviews AS i')
  .leftJoin('users', 'i.user_id', 'users.id')
  .whereRaw(`(i.is_active IS NOT TRUE OR users.is_valid IS NOT TRUE OR users.is_test) AND extract(epoch from i.updated_at) > ${lastUpdatedAt}`);
};

const getValidInterviews = function(lastUpdatedAt) {
  return knex.select('i.id', 'i.updated_at', 'responses')
  .from('sv_interviews AS i')
  .leftJoin('users', 'i.user_id', 'users.id')
  .whereRaw(`i.is_active IS TRUE AND users.is_valid IS TRUE AND users.is_test IS NOT TRUE AND extract(epoch from i.updated_at) > ${lastUpdatedAt}`);
};

export default function(router) {

  router.get('/monitoring/update_interviews_cache', function(req, res) {
    const forceUpdatedAt         = req.params.truncate == true;
    const interviewsCacheContent = helper.getCache('interviews.json', {
      updatedAt : 0,
      interviews: {
        /*updatedAt             :
        accessCode              :
        language                :
        isStarted               :
        isCompleted             :
        startedAt               :
        completedAt             :
        startedDate             :
        completedDate           :
        interviewDurationSeconds:*/
      },
      households: {
        /*homeCoordinates                   :
        householdSize                       :
        carNumber                           :
        numberOfTrips                       :
        residentialPhoneType                :
        wouldLikeToParticipateInOtherSurveys:
        didAlsoRespondByPhone               :
        zone                                :
        parentZone                          :
        personIds                           :
        tripIds                             :*/
      },
      persons   : {
        /*interviewId       :
        sequence            :
        age                 :
        gender              :
        occupation          :
        numberOfTrips       :
        drivingLicenseOwner :
        transitPassOwner    :
        carsharingMember    :
        bikesharingMember   :
        workOnTheRoad       :
        cellphoneOwner      :
        usualWorkPlaceIsHome:
        hasDisability       :
        isProxy             :
        tripIds             :*/
      },
      trips     : {
        /*interviewId    :
        sequence         :
        multimodeCategory:*/
      }
    });

    // get the list of invalid interviews ids (to make sure we don't keep an interview that was valid before)
    const invalidInterviewIds: any[] = [];
    getInvalidInterviewIds(forceUpdatedAt ? 0 : interviewsCacheContent.updatedAt).then(function(rows) {
      for (let i = 0, count = rows.length; i < count; i++)
      {
        const interviewId = rows[i].id;
        invalidInterviewIds.push(rows[i].id);
        if (interviewsCacheContent.interviews[interviewId])
        {
          // delete interview data for this invalid interview (it was valid before)
          delete interviewsCacheContent.interviews[interviewId];
          delete interviewsCacheContent.households[interviewId];
          for (const personId in interviewsCacheContent.persons)
          {
            const person = interviewsCacheContent.persons[personId];
            if (person.interviewId === interviewId)
            {
              delete interviewsCacheContent.persons[personId];
            }
          }
          for (const tripId in interviewsCacheContent.trips)
          {
            const trip = interviewsCacheContent.trips[tripId];
            if (trip.interviewId === interviewId)
            {
              delete interviewsCacheContent.trips[tripId];
            }
          }
        }
      }
      return getValidInterviews(forceUpdatedAt ? 0 : interviewsCacheContent.updatedAt);
    }).then(function(rows) {
      let lastUpdatedAt = interviewsCacheContent.updatedAt;
      for (let i = 0, count = rows.length; i < count; i++)
      {
        const interview   = rows[i];
        const interviewId = interview.id;
        // update lastUpdatedAt:
        const interviewUpdatedAt = moment(interview.updated_at).unix();
        lastUpdatedAt            = lastUpdatedAt < interviewUpdatedAt ? interviewUpdatedAt : lastUpdatedAt;
        // get responses content:
        const timezone                 = config.timezone || 'America/Montreal';
        const responses                = interview.responses;
        const startedAtTimestamp       = responses._startedAt   ? responses._startedAt   : null;
        const completedAtTimestamp     = responses._completedAt ? responses._completedAt : null;
        const startedAtDate            = startedAtTimestamp     ? moment.unix(startedAtTimestamp).tz(timezone).format('YYYY-MM-DD')   : null;
        const completedAtDate          = completedAtTimestamp   ? moment.unix(completedAtTimestamp).tz(timezone).format('YYYY-MM-DD') : null;
        const interviewDurationSeconds = startedAtTimestamp && completedAtTimestamp ? completedAtTimestamp - startedAtTimestamp       : null;
        
        interviewsCacheContent.interviews[interviewId] = {
          updatedAt               : interviewUpdatedAt,
          accessCode              : responses.accessCode,
          language                : responses._language,
          isStarted               : true,
          isCompleted             : responses._isCompleted || false,
          startedAt               : responses._startedAt,
          completedAt             : responses._completedAt,
          startedDate             : startedAtDate,
          completedDate           : completedAtDate,
          interviewDurationSeconds: interviewDurationSeconds,
        };

        if (responses._isCompleted)
        {
            // add persons:
          const persons   = _get(responses, 'household.persons', {});
          const personIds = Object.keys(persons);
          let   tripIds: string[]   = [];
          for (const personId in persons)
          {
            const person = persons[personId];
            const trips  = _get(person, 'trips', {});
            tripIds      = Object.keys(trips);
            interviewsCacheContent.persons[personId] = {
              interviewId, 
              sequence            : person._sequence,
              age                 : person.age,
              gender              : person.gender,
              occupation          : person.occupation,
              numberOfTrips       : tripIds.length,
              drivingLicenseOwner : person.drivingLicenseOwner,
              transitPassOwner    : person.transitPassOwner,
              carsharingMember    : person.carsharingMember,
              bikesharingMember   : person.bikesharingMember,
              workOnTheRoad       : person.workOnTheRoad,
              cellphoneOwner      : person.cellphoneOwner,
              usualWorkPlaceIsHome: person.usualWorkPlaceIsHome,
              hasDisability       : person.hasDisability,
              isProxy             : person.whoAnsweredForThisPerson !== person.id,
              tripIds
            }
            for (const tripId in trips)
            {
              const trip  = trips[tripId];
              interviewsCacheContent.trips[tripId] = {
                interviewId,
                sequence         : trip._sequence,
                multimodeCategory: trip.segments ? getTripMultimodeCategory(Object.values(trip.segments)) : null,
              };
            }
          }

          // find zone and parent zone for home geography:
          const homeGeography   = _get(responses, 'home.geography', null);
          const homeCoordinates = _get(responses, 'home.geography.geometry.coordinates', null);
          let   zone            = null;
          let   parentZone      = null;
          if (homeGeography && homeCoordinates)
          {
            turfFeatureEach<GeoJSON.Polygon | GeoJSON.MultiPolygon>(zonesGeojson as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>, function (zoneGeojson) {
              if (turfPointInPolygon(homeGeography, zoneGeojson))
              {
                zone       = zoneGeojson.properties.name;
                parentZone = zoneGeojson.properties.parentName;
                return false; // break the loop, specified in turf doc, break doesn't work here
              }
            });
          };

          // add household:
          const household = _get(responses, 'household', {});
          interviewsCacheContent.households[interviewId] = {
            homeCoordinates                     : homeCoordinates,
            householdSize                       : _get(household, 'size', null),
            carNumber                           : _get(household, 'carNumber', null),
            numberOfTrips                       : tripIds.length,
            residentialPhoneType                : _get(household, 'residentialPhoneType', null),
            wouldLikeToParticipateInOtherSurveys: _get(household, 'wouldLikeToParticipateInOtherSurveys', null),
            didAlsoRespondByPhone               : _get(household, 'didAlsoRespondByPhone', null),
            zone,
            parentZone,
            personIds,
            tripIds
          };
        }
        
      }
      interviewsCacheContent.updatedAt = lastUpdatedAt;
      helper.setCache('interviews', interviewsCacheContent);
      return res.download(helper.setupCacheFile('interviews'));
    }); 

  });

};
