/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';

import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import helper from '../helper';

export const personNoWorkTripReason = {
  type: "question",
  path: "household.persons.{_activePersonId}.noWorkTripReason",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'leaveNoWork',
      internalId: 1,
      label: {
        fr: function(interview, path) {
          const person = helper.getPerson(interview);
          if (helper.isWorker(person.occupation))
          {
            return "Congé, ne travaillait pas";
          }
        },
        en: function(interview, path) {
          const person = helper.getPerson(interview);
          if (helper.isWorker(person.occupation))
          {
            return "Leave, did not work";
          }
        }
      }
    },
    {
      value: 'holidays',
      internalId: 2,
      label: {
        fr: "Vacances",
        en: "Holidays"
      }
    },
    {
      value: 'sickness',
      internalId: 3,
      label: {
        fr: "Maladie",
        en: "Sickness"
      }
    },
    {
      value: 'workAtHome',
      internalId: 4,
      label: {
        fr: "Travail à la maison (télétravail)",
        en: "Work at home (telecommute)"
      }
    },
    {
      value: 'personalReason',
      internalId: 5,
      label: {
        fr: "Affaires ou raisons personnelles",
        en: "Personal reasons"
      }
    },
    {
      value: 'other',
      internalId: 6,
      label: {
        fr: "Autre raison",
        en: "Other reason"
      }
    },
    {
      value: 'dontKnow',
      internalId: 9,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: 'didMakeWorkTrips',
      conditional: false,
      internalId: 8,
      label: {
        fr: "A effectué au moins un déplacement pour le travail",
        en: "Did make at least one work-related trip"
      }
    },
    {
      value: 'nonApplicable',
      conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, motif non demandé",
        en: "Non applicable, reason not asked"
      }
    },
    {
      value: 'tripsUnknown',
      conditional: false,
      internalId: 11,
      label: {
        fr: "Déplacements inconnus, motif non demandé",
        en: "Trips unknown, reason not asked"
      }
    },
    {
      value: 'usualWorkPlaceIsHome',
      conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, lieu habituel de travail est le domicile",
        en: "Non applicable, usual work place is home"
      }
    }
  ],
  sameLine: false,
  label: {
    fr: function(interview, path) {
      const person        = helper.getPerson(interview);
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Pour quelle raison vous n'avez effectué aucun déplacement pour le travail le ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')}?`;
      }
      return `Pour quelle raison ${person.nickname} n'a effectué aucun déplacement pour le travail le ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')}?`;
    },
    en: function(interview, path) {
      const person        = helper.getPerson(interview);
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `For which reason did you make no trip on ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} for work purposes?`;
      }
      return `For which reason did ${person.nickname} make no trip on ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} for work purposes?`;
    }
  },
  conditional: function(interview, path) {
    const person = helper.getPerson(interview);
    if (!helper.isWorker(person.occupation))
    {
      return [false, 'nonApplicable'];
    }
    if (person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow')
    {
      return [false, 'tripsUnknown'];
    }
    if (person.usualWorkPlaceIsHome === true)
    {
      return [false, 'usualWorkPlaceIsHome'];
    }
    // add worker condition + not applicable for non-workers:
    if (helper.isWorker(person.occupation))
    {
      const visitedPlaces            = helper.getVisitedPlaces(person, true);
      const workRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
        return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork', 'workOnTheRoadFromHome'].indexOf(visitedPlace.activity) > -1;
      });
      return [workRelatedVisitedPlaces.length === 0, 'didMakeWorkTrips'];
    }
    return [false, 'nonApplicable'];
    //return true;
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personNoSchoolTripReason = {
  type: "question",
  path: "household.persons.{_activePersonId}.noSchoolTripReason",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'leaveNoSchool',
      internalId: 1,
      label: {
        fr: "Congé, pas de cours / pas d'école",
        en: "No course / no school"
      }
    },
    {
      value: 'holidays',
      internalId: 2,
      label: {
        fr: "Vacances",
        en: "Holidays"
      }
    },
    {
      value: 'sickness',
      internalId: 3,
      label: {
        fr: "Maladie",
        en: "Sickness"
      }
    },
    {
      value: 'studyAtHome',
      internalId: 4,
      label: {
        fr: "Études à la maison",
        en: "Studying at home"
      }
    },
    {
      value: 'personalReason',
      internalId: 5,
      label: {
        fr: "Affaires ou raisons personnelles",
        en: "Personal reasons"
      }
    },
    {
      value: 'other',
      internalId: 6,
      label: {
        fr: "Autre raison",
        en: "Other reason"
      }
    },
    {
      value: 'dontKnow',
      internalId: 9,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: 'didMakeSchoolTrips',
      conditional: false,
      internalId: 8,
      label: {
        fr: "A effectué au moins un déplacement pour les études",
        en: "Did make at least one school-related trip"
      }
    },
    {
      value: 'tripsUnknown',
      conditional: false,
      internalId: 11,
      label: {
        fr: "Déplacements inconnus, motif non demandé",
        en: "Trips unknown, reason not asked"
      }
    },
    {
      value: 'nonApplicable',
      conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, motif non demandé",
        en: "Non applicable, reason not asked"
      }
    }
  ],
  sameLine: false,
  label: {
    fr: function(interview, path) {
      const person        = helper.getPerson(interview);
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Pour quelle raison vous n'avez effectué aucun déplacement pour les études le ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')}?`;
      }
      return `Pour quelle raison ${person.nickname} n'a effectué aucun déplacement pour les études le ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')}?`;
    },
    en: function(interview, path) {
      const person        = helper.getPerson(interview);
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `For which reason did you make no trip on ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} for school or studies purposes?`;
      }
      return `For which reason did ${person.nickname} make no trip on ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} for school or studies purposes?`;
    }
  },
  conditional: function(interview, path) {
    const person = helper.getPerson(interview);
    if (person.didTripsOnTripsDateKnowTrips === 'no' || person.didTripsOnTripsDate === 'dontKnow')
    {
      return [false, 'tripsUnknown'];
    }
    if (!helper.isStudent(person.occupation))
    {
      return [false, 'nonApplicable'];
    }
    // add student condition + not applicable for non-student:
    const visitedPlaces = helper.getVisitedPlaces(person);
    if (helper.isStudent(person.occupation))
    {
      const schoolRelatedVisitedPlaces = visitedPlaces.filter((visitedPlace) => {
        return ['schoolUsual','schoolNotUsual'].indexOf(visitedPlace.activity) > -1;
      });
      return [schoolRelatedVisitedPlaces.length === 0, 'didMakeSchoolTrips'];
    }
    return [false, 'nonApplicable'];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personWhoAnsweredForThisPerson = {
  type: "question",
  path: "household.persons.{_activePersonId}.whoAnsweredForThisPerson",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  choices: function(interview, path) {
    const persons = surveyHelperNew.getResponse(interview, "household.persons", {});
    const choices = [];
    for (let personId in persons)
    {
      const person = persons[personId];
      if (person.age >= 16)
      {
        choices.push({
          value: personId,
          label: {
            fr: person.nickname,
            en: person.nickname
          }
        });
      }
    }
    return choices;
  },
  sameLine: false,
  label: {
    fr: function(interview, path) {
      return `Qui a complété l'entrevue de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}?`;
    },
    en: function(interview, path) {
      return `Who completed the interview for ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}?`;
    }
  },
  conditional: function(interview, path) {
    const person           = helper.getPerson(interview);
    const persons          = helper.getPersons(interview, false);
    let   respondentId     = null;
    let   countRespondents = 0;
    for (let personId in persons)
    {
      const _person = persons[personId];
      if (_person.age < 16)
      {
        respondentId = person._uuid;
      }
      else
      {
        countRespondents++;
      }
    }
    return [countRespondents > 1, (respondentId || person._uuid)];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};