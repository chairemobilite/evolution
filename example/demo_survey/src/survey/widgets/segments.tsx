/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import _get from 'lodash/get';
import { distance as turfDistance } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import helper from '../helper';
import subwayStations from '../subwayStations.json';
import trainStations  from '../trainStations.json';
import busRoutes  from '../busRoutes.json';
import { GroupConfig } from 'evolution-common/lib/services/widgets';
import { getModePreWidgetConfig } from 'evolution-common/lib/services/sections/segments/widgetSegmentModePre';
import { getModeWidgetConfig } from 'evolution-common/lib/services/sections/segments/widgetSegmentMode';
import { getSameAsReverseTripWidgetConfig } from 'evolution-common/lib/services/sections/segments/widgetSameAsReverseTrip';
import { getSegmentHasNextModeWidgetConfig } from 'evolution-common/lib/services/sections/segments/widgetSegmentHasNextMode';

export const personTrips: GroupConfig = {
  type: "group",
  path: "household.persons.{_activePersonId}.journeys.{_activeJourneyId}.trips",
  title: {
    fr: "Déplacements",
    en: "Trips"
  },
  filter: function(interview, groupedObjects) {
    const activeTripId = surveyHelperNew.getResponse(interview, '_activeTripId', null);
    if (activeTripId)
    {
      const filteredGroupedObject = {};
      for (const groupedObjectId in groupedObjects)
      {
        if (groupedObjectId === activeTripId)
        {
          filteredGroupedObject[groupedObjectId] = groupedObjects[groupedObjectId];
        }
      }
      return filteredGroupedObject;
    }
    else
    {
      return {};
    }
  },
  name: {
    fr: "",
    en: ""
  },
  showGroupedObjectDeleteButton: false,
  showGroupedObjectAddButton: false,
  widgets: [
    'segmentIntro',
    'segments',
    'tripJunctionGeography',
    //'introButtonSaveTrip',
    'buttonSaveTrip'
  ]
};

export const segments: GroupConfig = {
  type: "group",
  path: "segments",
  title: {
    fr: "Modes",
    en: "Modes"
  },
  name: {
    fr: (groupedObject, sequence, interview, path) => (`Mode de transport ${sequence}`),
    en: (groupedObject, sequence, interview, path) => (`Mode of transport ${sequence}`)
  },
  showTitle: false,
  showGroupedObjectDeleteButton: function(interview, path) {
    const segment = surveyHelperNew.getResponse(interview, path, {});
    return (segment && segment['_sequence'] > 1);
  },
  showGroupedObjectAddButton: function(interview, path) {
    const segments      = surveyHelperNew.getResponse(interview, path, {});
    const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
      return segmentA['_sequence'] - segmentB['_sequence'];
    });
    const segmentsCount = segmentsArray.length;
    const lastSegment   = segmentsArray[segmentsCount - 1];
    return segmentsCount === 0 || (lastSegment  && lastSegment.hasNextMode === true);
  },
  groupedObjectAddButtonLabel: {
    fr: function(interview, path) {
      const segments      = surveyHelperNew.getResponse(interview, path, {});
      const segmentsCount = Object.keys(segments).length;
      if (segmentsCount === 0)
      {
        return 'Sélectionner le premier (ou le seul) mode de transport utilisé pour ce déplacement';
      }
      else
      {
        return 'Sélectionner le mode de transport suivant';
      }
    },
    en: function(interview, path) {
      const segments = surveyHelperNew.getResponse(interview, path, {});
      const segmentsCount = Object.keys(segments).length;
      if (segmentsCount === 0)
      {
        return 'Select the first mode of transport used during this trip';
      }
      else
      {
        return 'Select the next mode of transport';
      }
    }
  },
  addButtonLocation: 'bottom' as const,
  widgets: [
    'segmentSameModeAsReverseTrip',
    'segmentModePre',
    'segmentMode',
    //'segmentParkingType',
    'segmentParkingPaymentType',
    'segmentVehicleOccupancy',
    'segmentVehicleType',
    'segmentDriver',
    'segmentBridgesAndTunnels',
    'segmentHighways',
    'segmentUsedBikesharing',
    'segmentSubwayStationStart',
    'segmentSubwayStationEnd',
    'segmentSubwayTransferStations',
    'segmentTrainStationStart',
    'segmentTrainStationEnd',
    'segmentBusLines',
    'segmentHasNextMode'
  ]
}

export const segmentIntro = {
  type: "text",
  text: {
    fr: function(interview, path) {
      return `Veuillez sélectionner **tous** les modes de transport utilisés pour effectuer ce déplacement, **dans l'ordre chronologique**:`;
    },
    en: function(interview, path) {
      return `Please select **all** modes of transport used for this trip, **in chronological order**:`;
    }
  }
};

export const segmentSameModeAsReverseTrip = getSameAsReverseTripWidgetConfig();

export const segmentModePre = getModePreWidgetConfig();

export const segmentMode = getModeWidgetConfig();

export const segmentHasNextMode = getSegmentHasNextModeWidgetConfig();

export const segmentVehicleOccupancy = {
  type: "question",
  path: "vehicleOccupancy",
  inputType: "string",
  datatype: "integer",
  twoColumns: true,
  label: {
    fr: "Combien de personnes étaient dans le véhicule au total, incluant le conducteur?",
    en: "How many persons were in the vehicle, including the driver?"
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'carDriver', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le nombre d'occupants est requis.`,
          en: `The number of persons in vehicle is required.`
        }
      },
      {
        validation: (isNaN(Number(value)) || !Number.isInteger(Number(value))),
        errorMessage: {
          fr: `Le nombre d'occupants est invalide.`,
          en: `The number of persons in vehicle is invalid.`
        }
      },
      {
        validation: (value <= 0),
        errorMessage: {
          fr: `Le nombre d'occupants doit être au moins de 1 (Vous devez inclure le conducteur).`,
          en: `The number of persons in the vehicle must be at least 1 (You need to include the driver).`
        }
      },
      {
        validation: (value > 60),
        errorMessage: {
          fr: `Le nombre d'occupants est trop élevé.`,
          en: `The number of persons in the vehicle is too high.`
        }
      }
    ];
  }
};

export const segmentVehicleType = {
  type: "question",
  path: "vehicleType",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Quel type de véhicule était-ce?",
    en: "What type of vehicle was used?"
  },
  choices: [
    {
      value: "householdCar",
      label: {
        fr: "Véhicule possédé par mon ménage",
        en: "Vehicle possessed by my household"
      },
      conditional: function(interview, path) {
        const householdCarNumber = surveyHelperNew.getResponse(interview, 'household.carNumber', null);
        return householdCarNumber > 0;
      }
    },
    {
      value: "freeFloatingAutoMobile",
      label: {
        fr: "Véhicule Auto-mobile sans réservation",
        en: "Auto-mobile vehicle without reservation"
      }
    },
    {
      value: "stationBasedCommunauto",
      label: {
        fr: "Véhicule Communauto en station avec réservation",
        en: "Station-based Communauto vehicle with reservation"
      }
    },
    {
      value: "freeFloatingCar2Go",
      label: {
        fr: "Véhicule Car2Go",
        en: "Car2Go Vehicle"
      }
    },
    {
      value: "rentalCar",
      label: {
        fr: "Véhicule de location (pas d'autopartage)",
        en: "Rental car (not carsharing)"
      }
    },
    {
      value: "borrowedCar",
      label: {
        fr: "Véhicule prêté par un ami, un voisin ou la famille",
        en: "Vehicle borrowed from a friend, neighbour or family"
      }
    },
    {
      value: "other",
      label: {
        fr: "Autre véhicule",
        en: "Another vehicle"
      }
    },
    {
      value: "dontKnow",
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: "notACarsharingMember",
      conditional: false,
      label: {
        fr: "Non membre de l'autopartage",
        en: "Not a carsharing member"
      }
    },
    {
      value: "notACarDriverMode",
      conditional: false,
      label: {
        fr: "Mode non auto conducteur",
        en: "Not a car driver mode"
      }
    },
    {
      value: "nonApplicable",
      conditional: false,
      label: {
        fr: "Non applicable",
        en: "Non applicable"
      }
    }
  ],
  conditional: function(interview, path) {
    const segment: any       = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode               = segment ? segment.mode : null;
    const person             = helper.getPerson(interview);
    const isCarsharingMember = person.carsharingMember === 'yes';
    const householdCarNumber = surveyHelperNew.getResponse(interview, 'household.carNumber', null);
    if (mode !== 'carDriver')
    {
      return [false, "notACarDriverMode"];
    }
    else if (!isCarsharingMember)
    {
      return [false, "notACarsharingMember"];
    }
    else if (householdCarNumber > 0)
    {
      return [false, "nonApplicable"];
    }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le type de véhicule est requis.`,
          en: `Vehicle type is required.`
        }
      }
    ];
  }
};

export const segmentUsedBikesharing = {
  type: "question",
  path: "usedBikesharing",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Était-ce un vélo BIXI (ou un autre vélo partagé)?",
    en: "Was it a BIXI (or another shared bicycle)?"
  },
  choices: [
    {
      value: 'yes',
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: 'no',
      label: {
        fr: "Non",
        en: "No"
      }
    },
    {
      value: "dontKnow",
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: "notABikesharingMember",
      conditional: false,
      label: {
        fr: "Non membre de vélopartage",
        en: "Not a bikesharing member"
      }
    },
    {
      value: "notABicycleMode",
      conditional: false,
      label: {
        fr: "Mode non vélo",
        en: "Not a bicycle mode"
      }
    }
  ],
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    if (mode !== 'bicycle')
    {
      return [false, "notABicycleMode"];
    }
    else
    {
      const person              = helper.getPerson(interview);
      const isBikesharingMember = person.bikesharingMember === 'yes';
      return [isBikesharingMember, "notABikesharingMember"];
    }
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requis.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const segmentDriver = {
  type: "question",
  path: "driver",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Qui conduisait?",
    en: "Who was driving?"
  },
  choices: function(interview) {
    const choices = [
      {
        value: "neighbour",
        internalId: 15,
        label: {
          fr: "Un voisin",
          en: "A neighbour"
        }
      },
      {
        value: "colleague",
        internalId: 16,
        label: {
          fr: "Un collègue de travail ou d'études",
          en: "A work or school colleague"
        }
      },
      {
        value: "familyMember",
        internalId: 17,
        label: {
          fr: "Un membre de la famille n'habitant pas chez vous",
          en: "A family member not living in your home"
        }
      },
      {
        value: "other",
        internalId: 18,
        label: {
          fr: "Une autre personne",
          en: "Another person"
        }
      },
      {
        value: "dontKnow",
        internalId: 19,
        label: {
          fr: "Je ne sais pas",
          en: "I don't know"
        }
      }
    ];
    const person  = helper.getPerson(interview);
    const drivers = helper.getDrivers(interview, true);
    for (let i = 0, count = drivers.length; i < count; i++)
    {
      const driver = drivers[i];
      if (driver._uuid !== person._uuid)
      {
        choices.unshift({
          value: driver._uuid,
          internalId: (driver['_sequence'] < 15 ? driver['_sequence'] : null),
          label: {
            fr: (driver.nickname || "Personne " + driver['_sequence']),
            en: (driver.nickname || "Person "   + driver['_sequence'])
          }
        });
      }
    }
    return choices;
  },
  conditional: function(interview, path) {
    const mode = surveyHelperNew.getResponse(interview, path, null, '../mode');
    return [mode === 'carPassenger', null];
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

export const segmentSubwayStationStart = {
  type: "question",
  path: "subwayStationStart",
  inputType: "multiselect",
  multiple: false,
  datatype: "string",
  twoColumns: true,
  shortcuts: [
    {
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre station',
        en: 'Other station'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: function(interview, path) {
    const trip: any                   = surveyHelperNew.getResponse(interview, path, null, '../../../');
    const subwayStationsFeatures = subwayStations.features;
    let   choices                = [];
    if (trip)
    {
      const person         = helper.getPerson(interview);
      const visitedPlaces: any  = helper.getVisitedPlaces(person, false);
      const origin         = visitedPlaces[trip._originVisitedPlaceUuid];
      const originGeometry = origin ? helper.getGeography(origin, person, interview) : null;
      if (originGeometry)
      {
        const originPoint = originGeometry;
        const _choices    = subwayStationsFeatures.map((subwayStation) => {
          const stationPoint: any = subwayStation.geometry;
          return {
            value: subwayStation.properties.shortname,
            internalId: subwayStation.properties.internalId,
            label: {
              fr: subwayStation.properties.name,
              en: subwayStation.properties.name
            },
            distance: turfDistance(originPoint, stationPoint)
          };
        });
        choices = _choices.sort(function(stationA, stationB) {
          return stationA.distance - stationB.distance;
        });
      }
    }
    else
    {
      choices = subwayStationsFeatures.map((subwayStation: any) => {
        return {
          value: subwayStation.properties.shortname,
          internalId: subwayStation.internalId,
          label: {
            fr: subwayStation.name,
            en: subwayStation.name
          }
        };
      });
    }
    choices.push({
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre station',
        en: 'Other station'
      }
    });
    choices.push({
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      }
    });
    return choices;
  },
  label: {
    fr: function(interview, path) {
      const person        = helper.getPerson(interview);
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      if (householdSize === 1)
      {
        return `À quelle station de métro êtes-vous embarqué${genderString2} au départ?`;
      }
      return `À quelle station de métro ${person.nickname} est-t-${genderString} embarqué${genderString2} au départ?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `At which subway station did you board the train at departure?`;
      }
      const person = helper.getPerson(interview);
      return `At which subway station did ${person.nickname} board the train at departure?`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitSubway', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez indiquer la station de métro de départ.`,
          en: `Please select the departure subway station.`
        }
      }
    ];
  }
};

export const segmentSubwayStationEnd = {
  type: "question",
  path: "subwayStationEnd",
  inputType: "multiselect",
  multiple: false,
  datatype: "string",
  twoColumns: true,
  shortcuts: [
    {
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre station',
        en: 'Other station'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: function(interview, path) {
    const trip: any              = surveyHelperNew.getResponse(interview, path, null, '../../../');
    const subwayStationsFeatures = subwayStations.features;
    let   choices                = [];
    if (trip)
    {
      const person              = helper.getPerson(interview);
      const visitedPlaces       = helper.getVisitedPlaces(person, false);
      const destination         = visitedPlaces[trip._destinationVisitedPlaceUuid];
      const destinationGeometry = destination ? helper.getGeography(destination, person, interview) : null;
      if (destinationGeometry)
      {
        const destinationPoint = destinationGeometry;
        const _choices         = subwayStationsFeatures.map((subwayStation) => {
          const stationPoint: any = subwayStation.geometry;
          return {
            value: subwayStation.properties.shortname,
            internalId: subwayStation.properties.internalId,
            label: {
              fr: subwayStation.properties.name,
              en: subwayStation.properties.name
            },
            distance: turfDistance(destinationPoint, stationPoint)
          };
        });
        choices = _choices.sort(function(stationA, stationB) {
          return stationA.distance - stationB.distance;
        });
      }
    }
    else
    {
      choices = subwayStationsFeatures.map((subwayStation: any) => {
        return {
          value: subwayStation.properties.shortname,
          internalId: subwayStation.internalId,
          label: {
            fr: subwayStation.name,
            en: subwayStation.name
          }
        };
      });
    }
    choices.push({
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre station',
        en: 'Other station'
      }
    });
    choices.push({
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      }
    });
    return choices;
  },
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const person        = helper.getPerson(interview);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      if (householdSize === 1)
      {
        return `À quelle station de métro êtes-vous débarqué${genderString2} à l'arrivée?`;
      }
      return `À quelle station de métro ${person.nickname} est-t-${genderString} débarqué${genderString2} à l'arrivée?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const person        = helper.getPerson(interview);
      if (householdSize === 1)
      {
        return `At which subway station did you alight the train at arrival?`;
      }
      return `At which subway station did ${person.nickname} alighted the train at arrival?`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitSubway', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const departureSubwayStation = surveyHelperNew.getResponse(interview, path, null, '../subwayStationStart');
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez indiquer la station de métro d'arrivée.`,
          en: `Please select the arrival subway station.`
        }
      },
      {
        validation: !_isBlank(value) && !_isBlank(departureSubwayStation) && departureSubwayStation === value && departureSubwayStation !== 'dontKnow' && departureSubwayStation !== 'other',
        errorMessage: {
          fr: `Les stations de départ et d'arrivée sont identiques.`,
          en: `Departure and arrival stations are the same.`
        }
      }
    ];
  }
};

export const segmentSubwayTransferStations = {
  type: "question",
  path: "subwayTransferStations",
  inputType: "multiselect",
  datatype: "string",
  multiple: true,
  twoColumns: true,
  shortcuts: [
    {
      value: 'none',
      internalId: '',
      label: {
        fr: 'Aucune',
        en: 'None'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: '',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: [
    {
      value: "none",
      internalId: "",
      label: {
        fr: "Aucune",
        en: "None"
      }
    },
    {
      value: "berriUQAM",
      internalId: "",
      label: {
        fr: "Berri-UQAM",
        en: "Berri-UQAM"
      }
    },
    {
      value: "jeanTalon",
      internalId: "",
      label: {
        fr: "Jean-Talon",
        en: "Jean-Talon"
      }
    },
    {
      value: "lionelGroulx",
      internalId: "",
      label: {
        fr: "Lionel-Groulx",
        en: "Lionel-Groulx"
      }
    },
    {
      value: "snowdon",
      internalId: "",
      label: {
        fr: "Snowdon",
        en: "Snowdon"
      }
    },
    {
      value: "dontKnow",
      internalId: "",
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
  ],
  containsHtml: true,
  label: {
    fr: function(interview, path) { 
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `À quelle(s) station(s) de métro avez-vous transféré? <br /><span class="_pale _oblique">Choisir \"Aucune\" si aucun transfert n'a été effectué</span>`;
      }
      const person        = helper.getPerson(interview);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      return `À quelle(s) station(s) de métro ${person.nickname} a-t-${genderString} transféré? <br /><span class="_pale _oblique">Choisir \"Aucune\" si aucun transfert n'a été effectué</span>`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `At which subway station did you transfer? <br /><span class="_pale _oblique">Choose \"None\" if no transfer occured</span>`;
      }
      const person = helper.getPerson(interview);
      return `At which subway station did ${person.nickname} transfer? <br /><span class="_pale _oblique">Choose \"None\" if no transfer occured</span>`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitSubway', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise. Choisissez \"Aucune\" si aucun transfert n'a été effectué.`,
          en: `This field is required. Choose \"None\" if no transfer occured.`
        }
      }
    ];
  }
};

export const segmentBridgesAndTunnels = {
  type: "question",
  path: "bridgesAndTunnels",
  inputType: "multiselect",
  datatype: "string",
  multiple: true,
  twoColumns: false,
  shortcuts: [
    {
      value: 'none',
      internalId: 720,
      label: {
        fr: 'Aucun',
        en: 'None'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 720,
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: [
    {
      value: "none",
      internalId: 720,
      label: {
        fr: "Aucun",
        en: "None",
      }
    },
    {
      value: "champlain",
      internalId: 701,
      label: {
        fr: "Pont Champlain",
        en: "Champlain Bridge",
      }
    },
    {
      value: "victoria",
      internalId: 702,
      label: {
        fr: "Pont Victoria",
        en: "Victoria Bridge",
      }
    },
    {
      value: "jacquesCartier",
      internalId: 703,
      label: {
        fr: "Pont Jacques-Cartier",
        en: "Jacques-Cartier Bridge",
      }
    },
    {
      value: "honoreMercier",
      internalId: 704,
      label: {
        fr: "Pont Honoré-Mercier",
        en: "Honoré-Mercier Bridge",
      }
    },
    {
      value: "louisHLafontaine",
      internalId: 705,
      label: {
        fr: "Pont-Tunnel Louis-H. Lafontaine",
        en: "Louis-H. Lafontaine Bridge-Tunnel",
      }
    },
    {
      value: "deLaConcorde",
      internalId: 706,
      label: {
        fr: "Pont de la Concorde (île Sainte-Hélène/île Notre-Dame)",
        en: "de la Concorde Bridge (Sainte-Hélène/Notre-Dame islands)",
      }
    },
    {
      value: "estacadeChamplain",
      internalId: 707,
      label: {
        fr: "Estacade du Pont Champlain",
        en: "Champlain Bridge Control Structure (Estacade)",
      }
    },
    {
      value: "lachapelle",
      internalId: 711,
      label: {
        fr: "Pont Lachapelle (Route 117)",
        en: "Lachapelle Bridge (Route 117)",
      }
    },
    {
      value: "viau",
      internalId: 708,
      label: {
        fr: "Pont Viau (Ahuntsic/laval)",
        en: "Viau Bridge (Ahuntsic/laval)",
      }
    },
    {
      value: "papineauLeblanc",
      internalId: 709,
      label: {
        fr: "Pont Papineau-Leblanc (A19)",
        en: "Papineau-Leblanc Bridge (A19)",
      }
    },
    {
      value: "pieIX",
      internalId: 710,
      label: {
        fr: "Pont Pie-IX (Route 125)",
        en: "Pie-IX Bridge (Route 125)",
      }
    },
    {
      value: "olivierCharbonneau",
      internalId: 721,
      label: {
        fr: "Pont Oliver-Charbonneau (A25 Laval payant)",
        en: "Oliver-Charbonneau Bridge (A25 Laval toll-bridge)",
      }
    },
    {
      value: "medericMartin",
      internalId: 712,
      label: {
        fr: "Pont Médéric-Martin (A15 Rivière-des-prairies)",
        en: "Médéric-Martin Bridge (A15 Rivière-des-prairies)",
      }
    },
    {
      value: "louisBisson",
      internalId: 713,
      label: {
        fr: "Pont Louis-Bisson (A13 Rivière-des-prairies)",
        en: "Louis-Bisson Bridge (A13 Rivière-des-prairies)",
      }
    },
    {
      value: "legardeur",
      internalId: 715,
      label: {
        fr: "Pont Legardeur (Route 138 Repentigny)",
        en: "Legardeur Bridge (Route 138 Repentigny)",
      }
    },
    {
      value: "charlesDeGaulle",
      internalId: 716,
      label: {
        fr: "Pont Charles-de-Gaulle (A40 Repentigny)",
        en: "Charles-de-Gaulle Bridge (A40 Repentigny)",
      }
    },
    {
      value: "galipeault",
      internalId: 717,
      label: {
        fr: "Pont Galipeault (A20 île Montréal/île Perrot) ",
        en: "Galipeault Bridge (A20 île Montréal/île Perrot) ",
      }
    },
    {
      value: "ileAuxTourtes",
      internalId: 718,
      label: {
        fr: "Pont de l'Île aux tourtes (A40 Vaudreuil)",
        en: "Île aux tourtes Bridge (A40 Vaudreuil)",
      }
    },
    {
      value: 'other',
      internalId: 719,
      label: {
        fr: "Autre pont ou tunnel",
        en: "Other bridge or tunnel",
      }
    },
    {
      value: 'dontKnow',
      internalId: 720,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know",
      }
    }
  ],
  containsHtml: true,
  label: {
    fr: `Veuillez sélectionner le ou les ponts et/ou tunnels empruntés: <br /><span class="_pale _oblique">Choisir \"Aucun\" si aucun n'a été emprunté</span>`,
    en: `Please select each bridge and/or tunnels that were used for this trip: <br /><span class="_pale _oblique">Choose \"None\" if none was used</span>`
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'carDriver' || mode === 'motorcycle', null];
  }/*,
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise. Choisissez \"Aucun\" si aucun n'a été utilisé.`,
          en: `This field is required. Choose \"None\" if none was used.`
        }
      }
    ];
  }*/
};

export const segmentHighways = {
  type: "question",
  path: "highways",
  inputType: "multiselect",
  datatype: "string",
  multiple: true,
  twoColumns: false,
  shortcuts: [
    {
      value: 'none',
      internalId: '597',
      label: {
        fr: 'Aucune',
        en: 'None'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: '598',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: [
    {
      value: "a10",
      internalId: "501",
      label: {
        fr: "Autoroute 10",
        en: "Highway 10"
      }
    },
    {
      value: "a13",
      internalId: "502",
      label: {
        fr: "Autoroute 13",
        en: "Highway 13"
      }
    },
    {
      value: "a15",
      internalId: "503",
      label: {
        fr: "Autoroute 15",
        en: "Highway 15"
      }
    },
    {
      value: "a19",
      internalId: "506",
      label: {
        fr: "Autoroute 19",
        en: "Highway 19"
      }
    },
    {
      value: "a20",
      internalId: "507",
      label: {
        fr: "Autoroute 20",
        en: "Highway 20"
      }
    },
    {
      value: "a25",
      internalId: "508",
      label: {
        fr: "Autoroute 25",
        en: "Highway 25"
      }
    },
    {
      value: "a30",
      internalId: "510",
      label: {
        fr: "Autoroute 30",
        en: "Highway 30"
      }
    },
    {
      value: "a31",
      internalId: "520",
      label: {
        fr: "Autoroute 31",
        en: "Highway 31"
      }
    },
    {
      value: "a35",
      internalId: "511",
      label: {
        fr: "Autoroute 35",
        en: "Highway 35"
      }
    },
    {
      value: "a40",
      internalId: "512",
      label: {
        fr: "Autoroute 40",
        en: "Highway 40"
      }
    },
    {
      value: "a50",
      internalId: "513",
      label: {
        fr: "Autoroute 50",
        en: "Highway 50"
      }
    },
    {
      value: "a440",
      internalId: "514",
      label: {
        fr: "Autoroute 440",
        en: "Highway 440"
      }
    },
    {
      value: "a520",
      internalId: "515",
      label: {
        fr: "Autoroute 520",
        en: "Highway 520"
      }
    },
    {
      value: "a530",
      internalId: "518",
      label: {
        fr: "Autoroute 530",
        en: "Highway 530"
      }
    },
    {
      value: "a540",
      internalId: "522",
      label: {
        fr: "Autoroute 540",
        en: "Highway 540"
      }
    },
    {
      value: "a640",
      internalId: "516",
      label: {
        fr: "Autoroute 640",
        en: "Highway 640"
      }
    },
    {
      value: "a720",
      internalId: "517",
      label: {
        fr: "Autoroute 720",
        en: "Highway 720"
      }
    },
    {
      value: "a730",
      internalId: "519",
      label: {
        fr: "Autoroute 730",
        en: "Highway 730"
      }
    },
    {
      value: "a930",
      internalId: "521",
      label: {
        fr: "Autoroute 930",
        en: "Highway 930"
      }
    },
    {
      value: "r104",
      internalId: "551",
      label: {
        fr: "Route 104",
        en: "Route 104"
      }
    },
    {
      value: "r112",
      internalId: "552",
      label: {
        fr: "Route 112",
        en: "Route 112"
      }
    },
    {
      value: "r116",
      internalId: "553",
      label: {
        fr: "Route 116",
        en: "Route 116"
      }
    },
    {
      value: "r117",
      internalId: "554",
      label: {
        fr: "Route 117 (incluant Curé-Labelle et Marcel-Laurin)",
        en: "Route 117 (including Curé-Labelle and Marcel-Laurin)"
      }
    },
    {
      value: "r125",
      internalId: "555",
      label: {
        fr: "Route 125 (inclant Boul. Pie-IX)",
        en: "Route 125 (including Bld. Pie-IX)"
      }
    },
    {
      value: "r131",
      internalId: "556",
      label: {
        fr: "Route 131",
        en: "Route 131"
      }
    },
    {
      value: "r132",
      internalId: "557",
      label: {
        fr: "Route 132",
        en: "Route 132"
      }
    },
    {
      value: "r133",
      internalId: "558",
      label: {
        fr: "Route 133",
        en: "Route 133"
      }
    },
    {
      value: "r134",
      internalId: "559",
      label: {
        fr: "Route 134 (incluant Boulevard Taschereau)",
        en: "Route 134 (including Bld. Taschereau)"
      }
    },
    {
      value: "r137",
      internalId: "560",
      label: {
        fr: "Route 137",
        en: "Route 137"
      }
    },
    {
      value: "r138",
      internalId: "561",
      label: {
        fr: "Route 138 (incluant rue Sherbrooke)",
        en: "Route 138 (including Sherbrooke St.)"
      }
    },
    {
      value: "r148",
      internalId: "562",
      label: {
        fr: "Route 148 (incluant Arthure-Sauvé)",
        en: "Route 148 (including Arthure-Sauvé)"
      }
    },
    {
      value: "r158",
      internalId: "563",
      label: {
        fr: "Route 158",
        en: "Route 158"
      }
    },
    {
      value: "r201",
      internalId: "564",
      label: {
        fr: "Route 201",
        en: "Route 201"
      }
    },
    {
      value: "r205",
      internalId: "565",
      label: {
        fr: "Route 205",
        en: "Route 205"
      }
    },
    {
      value: "r207",
      internalId: "566",
      label: {
        fr: "Route 207",
        en: "Route 207"
      }
    },
    {
      value: "r209",
      internalId: "567",
      label: {
        fr: "Route 209",
        en: "Route 209"
      }
    },
    {
      value: "r217",
      internalId: "568",
      label: {
        fr: "Route 217",
        en: "Route 217"
      }
    },
    {
      value: "r219",
      internalId: "569",
      label: {
        fr: "Route 219",
        en: "Route 219"
      }
    },
    {
      value: "r221",
      internalId: "570",
      label: {
        fr: "Route 221",
        en: "Route 221"
      }
    },
    {
      value: "r223",
      internalId: "589",
      label: {
        fr: "Route 223",
        en: "Route 223"
      }
    },
    {
      value: "r227",
      internalId: "571",
      label: {
        fr: "Route 227",
        en: "Route 227"
      }
    },
    {
      value: "r229",
      internalId: "572",
      label: {
        fr: "Route 229",
        en: "Route 229"
      }
    },
    {
      value: "r233",
      internalId: "573",
      label: {
        fr: "Route 233",
        en: "Route 233"
      }
    },
    {
      value: "r236",
      internalId: "574",
      label: {
        fr: "Route 236",
        en: "Route 236"
      }
    },
    {
      value: "r329",
      internalId: "575",
      label: {
        fr: "Route 329",
        en: "Route 329"
      }
    },
    {
      value: "r333",
      internalId: "576",
      label: {
        fr: "Route 333",
        en: "Route 333"
      }
    },
    {
      value: "r335",
      internalId: "577",
      label: {
        fr: "Route 335",
        en: "Route 335"
      }
    },
    {
      value: "r337",
      internalId: "578",
      label: {
        fr: "Route 337 (incluant Chemin Gascon)",
        en: "Route 337 (including Chemin Gascon)"
      }
    },
    {
      value: "r338",
      internalId: "579",
      label: {
        fr: "Route 338",
        en: "Route 338"
      }
    },
    {
      value: "r339",
      internalId: "580",
      label: {
        fr: "Route 339",
        en: "Route 339"
      }
    },
    {
      value: "r340",
      internalId: "581",
      label: {
        fr: "Route 340",
        en: "Route 340"
      }
    },
    {
      value: "r341",
      internalId: "582",
      label: {
        fr: "Route 341",
        en: "Route 341"
      }
    },
    {
      value: "r342",
      internalId: "583",
      label: {
        fr: "Route 342",
        en: "Route 342"
      }
    },
    {
      value: "r343",
      internalId: "584",
      label: {
        fr: "Route 343",
        en: "Route 343"
      }
    },
    {
      value: "r344",
      internalId: "585",
      label: {
        fr: "Route 344",
        en: "Route 344"
      }
    },
    {
      value: "r348",
      internalId: "590",
      label: {
        fr: "Route 348",
        en: "Route 348"
      }
    },
    {
      value: "r364",
      internalId: "591",
      label: {
        fr: "Route 364",
        en: "Route 364"
      }
    },
    {
      value: "r370",
      internalId: "588",
      label: {
        fr: "Route 370",
        en: "Route 370"
      }
    },
    {
      value: "none",
      internalId: "597",
      label: {
        fr: "Aucune",
        en: "None"
      }
    },
    {
      value: "dontKnow",
      internalId: "598",
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    }
  ],
  containsHtml: true,
  label: {
    fr: `Veuillez sélectionner la ou les autoroutes et routes nationales empruntées: <br /><span class="_pale _oblique">Choisir \"Aucune\" si aucune n'a été empruntée</span>`,
    en: `Please select each highway that were used for this trip: <br /><span class="_pale _oblique">Choose \"None\" if none was used</span>`
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'carDriver' || mode === 'motorcycle', null];
  }/*,
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Cette réponse est requise. Choisissez \"Aucune\" si aucun n'a été utilisé.`,
          en: `This field is required. Choose \"None\" if none was used.`
        }
      }
    ];
  }*/
};

export const segmentTrainStationStart = {
  type: "question",
  path: "trainStationStart",
  inputType: "multiselect",
  multiple: false,
  datatype: "string",
  twoColumns: true,
  shortcuts: [
    {
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre gare',
        en: 'Other station'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: function(interview, path) {
    const trip: any                  = surveyHelperNew.getResponse(interview, path, null, '../../../');
    const trainStationsFeatures = trainStations.features;
    let   choices               = [];
    if (trip)
    {
      const person         = helper.getPerson(interview);
      const visitedPlaces  = helper.getVisitedPlaces(person, false);
      const origin         = visitedPlaces[trip._originVisitedPlaceUuid];
      const originGeometry = origin ? helper.getGeography(origin, person, interview) : null;
      if (originGeometry)
      {
        const originPoint = originGeometry;
        const _choices    = trainStationsFeatures.map((trainStation) => {
          const stationPoint: any = trainStation.geometry;
          return {
            value: trainStation.properties.shortname,
            internalId: trainStation.properties.internalId,
            label: {
              fr: trainStation.properties.name,
              en: trainStation.properties.name
            },
            distance: turfDistance(originPoint, stationPoint)
          };
        });
        choices = _choices.sort(function(stationA, stationB) {
          return stationA.distance - stationB.distance;
        });
      }
    }
    else
    {
      choices = trainStationsFeatures.map((trainStation: any) => {
        return {
          value: trainStation.properties.shortname,
          internalId: trainStation.internalId,
          label: {
            fr: trainStation.name,
            en: trainStation.name
          }
        };
      });
    }
    choices.push({
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre gare',
        en: 'Other station'
      }
    });
    choices.push({
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      }
    });
    return choices;
  },
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const person        = helper.getPerson(interview);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      if (householdSize === 1)
      {
        return `À quelle gare êtes-vous embarqué${genderString2} au départ?`;
      }
      return `À quelle gare ${person.nickname} est-t-${genderString} embarqué${genderString2} au départ?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `At which train station did you board the train at departure?`;
      }
      const person = helper.getPerson(interview);
      return `At which train station did ${person.nickname} board the train at departure?`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitRail', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez indiquer la gare de départ.`,
          en: `Please select the departure train station.`
        }
      }
    ];
  }
};

export const segmentTrainStationEnd = {
  type: "question",
  path: "trainStationEnd",
  inputType: "multiselect",
  multiple: false,
  datatype: "string",
  twoColumns: true,
  shortcuts: [
    {
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre gare',
        en: 'Other station'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      },
      color: 'grey'
    }
  ],
  choices: function(interview, path) {
    const trip: any             = surveyHelperNew.getResponse(interview, path, null, '../../../');
    const trainStationsFeatures = trainStations.features;
    let   choices               = [];
    if (trip)
    {
      const person              = helper.getPerson(interview);
      const visitedPlaces       = helper.getVisitedPlaces(person, false);
      const destination         = visitedPlaces[trip._destinationVisitedPlaceUuid];
      const destinationGeometry = destination ? helper.getGeography(destination, person, interview) : null;
      if (destinationGeometry)
      {
        const destinationPoint = destinationGeometry;
        const _choices         = trainStationsFeatures.map((trainStation: any) => {
          const stationPoint = trainStation.geometry;
          return {
            value: trainStation.properties.shortname,
            internalId: trainStation.properties.internalId,
            label: {
              fr: trainStation.properties.name,
              en: trainStation.properties.name
            },
            distance: turfDistance(destinationPoint, stationPoint)
          };
        });
        choices = _choices.sort(function(stationA, stationB) {
          return stationA.distance - stationB.distance;
        });
      }
    }
    else
    {
      choices = trainStationsFeatures.map((trainStation: any) => {
        return {
          value: trainStation.properties.shortname,
          internalId: trainStation.internalId,
          label: {
            fr: trainStation.name,
            en: trainStation.name
          }
        };
      });
    }
    choices.push({
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre gare',
        en: 'Other station'
      }
    });
    choices.push({
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Je ne sais pas',
        en: "I don't know"
      }
    });
    return choices;
  },
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const person        = helper.getPerson(interview);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      const genderString2 = helper.getGenderString(person, 'e', '', '(e)', '(e)');
      if (householdSize === 1)
      {
        return `À quelle gare êtes-vous débarqué${genderString2} à l'arrivée?`;
      }
      return `À quelle gare ${person.nickname} est-t-${genderString} débarqué${genderString2} à l'arrivée?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `At which train station did you alight the train at arrival?`;
      }
      const person = helper.getPerson(interview);
      return `At which train station did ${person.nickname} alighted the train at arrival?`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitRail', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const departureTrainStation = surveyHelperNew.getResponse(interview, path, null, '../trainStationStart');
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez indiquer la gare d'arrivée.`,
          en: `Please select the arrival train station.`
        }
      },
      {
        validation: !_isBlank(value) && !_isBlank(departureTrainStation) && departureTrainStation === value && departureTrainStation !== 'dontKnow' && departureTrainStation !== 'other',
        errorMessage: {
          fr: `Les gares de départ et d'arrivée sont identiques.`,
          en: `Departure and arrival stations are the same.`
        }
      }
    ];
  }
};

export const segmentBusLines = {
  type: "question",
  path: "busLines",
  inputType: "multiselect",
  multiple: true,
  datatype: "string",
  twoColumns: false,
  containsHtml: true,
  shortcuts: [
    {
      value: 'other',
      internalId: 'other',
      label: {
        fr: 'Autre(s) ligne(s) de bus',
        en: 'Other bus line(s)'
      },
      color: 'grey'
    },
    {
      value: 'dontKnow',
      internalId: 'dontKnow',
      label: {
        fr: 'Ligne(s) inconnue(s)',
        en: "Unknown line(s)"
      },
      color: 'grey'
    }
  ],
  choices: function(interview, path) {
    
    const busRoutesFeatures = busRoutes.features;
    const choices: any[]    = busRoutesFeatures.map((busRoute: any) => {
      const busRouteName = busRoute.properties.name;
      return {
        value: busRoute.properties.slug,
        internalId: busRoute.internalId,
        color: busRoute.properties.color,
        label: {
          fr: busRouteName,
          en: busRouteName
        }
      };
    });
    choices.push({
      value: 'other',
      internalId: 'other',
      color: '#666666',
      sortableName: 'zother',
      label: {
        fr: 'Autre(s) ligne(s) de bus',
        en: 'Other bus line(s)'
      }
    });
    choices.push({
      value: 'dontKnow',
      internalId: 'dontKnow',
      color: '#666666',
      sortableName: 'zdontknow',
      label: {
        fr: 'Ligne(s) inconnue(s)',
        en: "Unknown line(s)"
      }
    });
    return choices;
  },
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Quelle(s) ligne(s) de bus avez-vous utilisée(s) (dans l'ordre chronologique)?<br />
        <span class="_pale _oblique">Pour chaque ligne utilisée, inscrivez son numéro ou son nom puis sélectionnez-la dans la liste des résultats.</span>`;
      }
      const person        = helper.getPerson(interview);
      const genderString  = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      return `Quelle(s) ligne(s) de bus ${person.nickname} a-t-${genderString} utilisée(s) (dans l'ordre chronologique)?<br />
      <span class="_pale _oblique">Pour chaque ligne utilisée, inscrivez le numéro de la ligne ou son nom puis sélectionnez-la dans la liste des résultats.</span>`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Which bus line(s) did you use (in chronological order)<br />
        <span class="_pale _oblique">For each bus line used, write the ligne number or name, then select it from the menu.</span>`;
      }
      const person = helper.getPerson(interview);
      return `Which bus line(s) did ${person.nickname} use (in chronological order)?<br />
      <span class="_pale _oblique">For each bus line used, write the ligne number or name, then select it from the menu.</span>`;
    }
  },
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'transitBus', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez indiquer la ou les lignes de bus.`,
          en: `Please select bus line(s).`
        }
      }
    ];
  }
};

export const tripJunctionGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "junctionGeography",
  datatype: "geojson",
  canBeCollapsed: false,
  autoCollapseWhenValid: false, // not implemented
  label: {
    fr: function(interview, path) {
      const trip = surveyHelperNew.getResponse(interview, path, null, '../');
      if (trip)
      {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        if (!_isBlank(tripTransferCategory))
        {
          const person          = helper.getPerson(interview);
          const genderString    = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
          const genderString2   = helper.getGenderString(person, 'e', '', '(e)', '(e)');
          const nickname        = person.nickname;
          const householdSize   = surveyHelperNew.getResponse(interview, 'household.size', null);
          const isAlone         = householdSize === 1;
          const firstFormVerb   = isAlone ? 'avez-vous' : `a-t-${genderString}`;
          const secondFormVerb  = isAlone ? 'êtes-vous' : `est-${genderString}`;
          const previousMode    = tripTransferCategory.previousMode;
          const nextMode        = tripTransferCategory.nextMode;
          let   previousModeStr = '';
          let   nextModeStr     = '';

          if (tripTransferCategory.category === 'private_public')
          {
            switch(previousMode)
            {
              case 'bicycle': 
                previousModeStr = isAlone ? `${firstFormVerb} stationné ou embarqué votre vélo` : `${nickname} ${firstFormVerb} stationné ou embarqué son vélo`;
                break;
              case 'carDriver': 
                previousModeStr = isAlone ? `${firstFormVerb} stationné votre véhicule` : `${nickname} ${firstFormVerb} stationné son véhicule`;
                break;
              case 'motorcycle':
                previousModeStr = isAlone ? `${firstFormVerb} stationné votre moto` : `${nickname} ${firstFormVerb} stationné sa moto`;
                break;
              case 'carPassenger':
                previousModeStr = isAlone ? `${secondFormVerb} débarqué${genderString2} du véhicule` : `${nickname} ${secondFormVerb} débarqué${genderString2} du véhicule`;
                break;
              case 'taxi':
                previousModeStr = isAlone ? `${secondFormVerb} débarqué${genderString2} du taxi` : `${nickname} ${secondFormVerb} débarqué${genderString2} du taxi`;
                break;
              default: 
                previousModeStr = isAlone ? `${secondFormVerb} débarqué${genderString2} du véhicule` : `${nickname} ${secondFormVerb} débarqué${genderString2} du véhicule`;
            }
            switch(nextMode)
            {
              case 'transitBus': 
                nextModeStr = 'le bus';
                break;
              case 'transitSubway': 
                nextModeStr = 'le métro';
                break;
              case 'transitRail':
                nextModeStr = 'le train';
                break;
              case 'transitTaxi':
                nextModeStr = 'le taxi collectif';
                break;
              case 'intercityBus':
                nextModeStr = 'le bus interurbain';
                break;
              case 'intercityRail':
                nextModeStr = 'le train interurbain';
                break;
              case 'busOther':
                nextModeStr = 'le bus';
                break;
              case 'plane':
                nextModeStr = "l'avion";
                break;
              default: 
                nextModeStr = 'le transport public';
            }
            return `À quel endroit ${previousModeStr} avant d'utiliser ${nextModeStr}?`;
          }
          else if (tripTransferCategory.category === 'public_private')
          {
            switch(previousMode)
            {
              case 'transitBus': 
                previousModeStr = 'le bus';
                break;
              case 'transitSubway': 
                previousModeStr = 'le métro';
                break;
              case 'transitRail':
                previousModeStr = 'le train';
                break;
              case 'transitTaxi':
                previousModeStr = 'le taxi collectif';
                break;
              case 'intercityBus':
                previousModeStr = 'le bus interurbain';
                break;
              case 'intercityRail':
                previousModeStr = 'le train interurbain';
                break;
              case 'busOther':
                previousModeStr = 'le bus';
                break;
              case 'plane':
                previousModeStr = "l'avion";
                break;
              default: 
                previousModeStr = 'le transport public';
            }
            switch(nextMode)
            {
              case 'bicycle': 
                nextModeStr = isAlone ? `${firstFormVerb} récupéré ou réutilisé votre vélo` : `${nickname} ${firstFormVerb} récupéré ou réutilisé son vélo`;
                break;
              case 'carDriver': 
                nextModeStr = isAlone ? `${firstFormVerb} récupéré votre véhicule` : `${nickname} ${firstFormVerb} récupéré son véhicule`;
                break;
              case 'motorcycle':
                nextModeStr = isAlone ? `${firstFormVerb} récupéré votre moto` : `${nickname} ${firstFormVerb} récupéré sa moto`;
                break;
              case 'carPassenger':
                nextModeStr = isAlone ? `${secondFormVerb} embarqué${genderString2} dans le véhicule` : `${nickname} ${secondFormVerb} embarqué${genderString2} dans le  véhicule`;
                break;
              case 'taxi':
                nextModeStr = isAlone ? `${secondFormVerb} embarqué${genderString2} dans le taxi` : `${nickname} ${secondFormVerb} embarqué${genderString2} dans le taxi`;
                break;
              default: 
                nextModeStr = isAlone ? `${firstFormVerb} récupéré votre véhicule` : `${nickname} ${firstFormVerb} récupéré son véhicule`;
            }
            return `À quel endroit ${nextModeStr} après avoir utilisé ${previousModeStr}?`;
          }
        }
      }
    },
    en: function(interview, path) {
      const trip = surveyHelperNew.getResponse(interview, path, null, '../');
      if (trip)
      {
        const tripTransferCategory = helper.getTripTransferCategory(trip);
        if (!_isBlank(tripTransferCategory))
        {
          const person        = helper.getPerson(interview);
          const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
          const isAlone       = householdSize === 1;
          const nickname      = isAlone ? 'you'  : person.nickname;
          const pronoun       = isAlone ? 'your' : (person.gender === 'female' ? 'her' : (person.gender === 'male' ? 'his' : 'their'));
          if (tripTransferCategory.category === 'private_public')
          {
            const previousMode    = tripTransferCategory.previousMode;
            const nextMode        = tripTransferCategory.nextMode;
            let   previousModeStr = '';
            let   nextModeStr     = '';
            switch(previousMode)
            {
              case 'bicycle': 
                previousModeStr = `park or stop riding ${pronoun} bicycle`;
                break;
              case 'carDriver': 
                previousModeStr = `park ${pronoun} vehicle`;
                break;
              case 'motorcycle':
                previousModeStr = `park ${pronoun} motorcycle`;
                break;
              case 'carPassenger':
                previousModeStr = `leave the vehicle`;
                break;
              case 'taxi':
                previousModeStr = `leave the taxi`;
                break;
              default: 
                previousModeStr = `leave the vehicle`;
            }
            switch(nextMode)
            {
              case 'transitBus': 
                nextModeStr = 'the bus';
                break;
              case 'transitSubway': 
                nextModeStr = 'the subway';
                break;
              case 'transitRail':
                nextModeStr = 'the train';
                break;
              case 'transitTaxi':
                nextModeStr = 'the taxibus';
                break;
              case 'intercityBus':
                nextModeStr = 'the intercity bus';
                break;
              case 'intercityRail':
                nextModeStr = 'the intercity train';
                break;
              case 'busOther':
                nextModeStr = 'the bus';
                break;
              case 'plane':
                nextModeStr = "the plane";
                break;
              default: 
                nextModeStr = 'public transport';
            }
            return `Where did ${nickname} ${previousModeStr} before using ${nextModeStr}`;
          }
          else if (tripTransferCategory.category === 'public_private')
          {
            const previousMode    = tripTransferCategory.previousMode;
            const nextMode        = tripTransferCategory.nextMode;
            let   previousModeStr = '';
            let   nextModeStr     = '';
            let   verb            = 'a';
            switch(previousMode)
            {
              case 'transitBus': 
                previousModeStr = 'the bus';
                break;
              case 'transitSubway': 
                previousModeStr = 'the subway';
                break;
              case 'transitRail':
                previousModeStr = 'the train';
                break;
              case 'transitTaxi':
                previousModeStr = 'the taxibus';
                break;
              case 'intercityBus':
                previousModeStr = 'the intercity bus';
                break;
              case 'intercityRail':
                previousModeStr = 'the intercity train';
                break;
              case 'busOther':
                previousModeStr = 'the bus';
                break;
              case 'plane':
                previousModeStr = "the plane";
                break;
              default: 
                previousModeStr = 'public transport';
            }
            switch(nextMode)
            {
              case 'bicycle': 
                nextModeStr = `retrieve or start riding ${pronoun} bicycle`;
                break;
              case 'carDriver': 
                nextModeStr = `retrieve ${pronoun} vehicle`;
                break;
              case 'carPassenger':
                nextModeStr = 'enter the vehicle';
                break;
              case 'motorcycle':
                nextModeStr = `retrieve ${pronoun} motorcycle`;
                break;
              case 'taxi':
                nextModeStr = `enter the taxi`;
                break;
              default: 
                nextModeStr = `retrieve ${pronoun} vehicle`;
            }
            return `Where did ${nickname} ${nextModeStr} after using ${previousModeStr}`;
          }
        }
      }

    },
  },
  icon: {
    url: (interview, path) => (`/dist/images/activities_icons/default_marker.svg`)
  },
  defaultCenter: function(interview, path) {
    const person               = helper.getPerson(interview);
    const originVisitedPlaceId = surveyHelperNew.getResponse(interview, path, null, '../_originVisitedPlaceUuid');
    const visitedPlaces        = helper.getVisitedPlaces(person, false);
    if (originVisitedPlaceId)
    {
      const originVisitedPlace = visitedPlaces[originVisitedPlaceId];
      if (originVisitedPlace)
      {
        const originGeography = helper.getGeography(originVisitedPlace, person, interview);
        const originCoordinates = _get(originGeography, 'geometry.coordinates', null);
        if (originCoordinates)
        {
          return {lat: originCoordinates[1], lon: originCoordinates[0] }
        }
      }
    }
    return config.mapDefaultCenter;
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le positionnement du lieu de transfert est requis.`,
          en: `Transfer location is required.`
        }
      }
    ];
  },
  conditional: function(interview, path) {
    const trip = surveyHelperNew.getResponse(interview, path, null, '../');
    if (trip)
    {
      const tripTransferCategory = helper.getTripTransferCategory(trip);
      return [!_isBlank(tripTransferCategory), null];
    }
    return [false, null];
  }
};

export const segmentParkingType = {
  type: "question",
  path: "parkingType",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Dans quel type de stationnement le véhicule a-t-il été garé?",
    en: "In what type of parking did the vehicle park?"
  },
  choices: [
    {
      value: "streetside",
      label: {
        fr: "Sur rue",
        en: "Streetside"
      }
    },
    {
      value: "incentive",
      label: {
        fr: "Stationnement incitatif",
        en: "Incentive parking"
      }
    },
    {
      value: "outdoor",
      label: {
        fr: "Stationnement extérieur (hors rue)",
        en: "Outdoor (out of street)"
      }
    },
    {
      value: "indoor",
      label: {
        fr: "Stationnement intérieur",
        en: "Indoor"
      }
    },
    {
      value: "residential",
      label: {
        fr: "Stationnement résidentiel (entrée, garage)",
        en: "Residential parking (driveway, garage)"
      }
    },
    {
      value: "other",
      label: {
        fr: "Autre",
        en: "Other"
      }
    },
    {
      value: "notParked",
      label: {
        fr: "Le véhicule n'a pas été stationné",
        en: "The vehicle was not parked"
      }
    },
    {
      value: "dontKnow",
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    }
  ],
  conditional: function(interview, path) {
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'carDriver', null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le type de stationnement est requis.`,
          en: `Parking type is required.`
        }
      }
    ];
  }
};

export const segmentParkingPaymentType = {
  type: "question",
  path: "parkingPaymentType",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Avez-vous payé pour stationner le véhicule?`;
      }
      const person = helper.getPerson(interview);
      return `Est-ce que ${person && person.nickname ? person.nickname : 'cette personne'} a payé pour stationner le véhicule?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Did you pay to park the vehicle?`;
      }
      const person = helper.getPerson(interview);
      return `Did ${person && person.nickname ? person.nickname : 'this person'} pay to park the vehicle?`;
    },
  },
  choices: [
    {
        groupLabel: '',
        groupShortname: 'paid',
        choices: [
            {
                value: "parkingMeter",
                internalId: 1,
                label: {
                  fr: "Oui (parcomètre)",
                  en: "Yes (parking meter)"
                }
            },
            {
                value: "residentialPermit",
                internalId: 1,
                label: {
                    fr: "Oui (vignette de stationnement résidentiel)",
                    en: "Yes (residential permit)"
                }
            },
            {
                value: "parkingPass",
                internalId: 1,
                label: {
                    fr: "Oui (passe ou permis de stationnement)",
                    en: "Yes (parking pass or permit)"
                }
            },
        ]
    }, {
        groupLabel: '',
        groupShortname: 'freeOthers',
        choices: [
            {
                value: "free",
                internalId: 2,
                label: {
                  fr: "Non (gratuit)",
                  en: "No (free parking)"
                }
            },
            {
                value: "paidByEmployer",
                internalId: 3,
                label: {
                  fr: "Non (payé par l'employeur)",
                  en: "No (paid by employer)"
                },
                conditional: function(interview, path) {
                  const person = helper.getPerson(interview);
                  const journeys = odSurveyHelper.getJourneysArray({ person });
                  const currentJourney = journeys[journeys.length - 1];
                  const trip: any = surveyHelperNew.getResponse(interview, path, null, '../../');
                  const visitedPlaces = currentJourney.visitedPlaces;
                  const destination = trip && trip._destinationVisitedPlaceUuid && visitedPlaces[trip._destinationVisitedPlaceUuid] ? visitedPlaces[trip._destinationVisitedPlaceUuid] : null;
                  const destinationActivity = destination ? destination.activity : null;
                  return ['workUsual', 'workNotUsual', 'workOnTheRoad', 'workOnTheRoadFromUsualWork'].indexOf(destinationActivity) > -1;
                }
            },
            {
                value: "didNotPark",
                internalId: 5,
                label: {
                  fr: "Le véhicule n'a pas été stationné",
                  en: "The vehicle was not parked"
                }
            },
            {
                value: "dontKnow",
                internalId: 4,
                label: {
                  fr: "Je ne sais pas",
                  en: "I don't know"
                }
            },
            {
                value: "nonApplicable",
                internalId: 5,
                label: {
                  fr: "Non applicable",
                  en: "N/A"
                },
                conditional: false
            }
        ]
    }
  ],
  conditional: function(interview, path) {
    //const segment = surveyHelperNew.getResponse(interview, path, null, '../');
    //const parkingType    = segment ? segment.parkingType : null;
    //return [!_isBlank(parkingType), 'nonApplicable'];
    const segment: any = surveyHelperNew.getResponse(interview, path, null, '../');
    const mode    = segment ? segment.mode : null;
    return [mode === 'carDriver', null];
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

export const personTripsTitle = {
  type: "text",
  align: "left",
  text: {
    fr: function(interview, path) {
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL');
      if (householdSize === 1)
      {
        return `Vos déplacements du ${formattedTripsDate}&nbsp;:`;
      }
      const personId           = surveyHelperNew.getResponse(interview, '_activePersonId');
      const person : any            = surveyHelperNew.getResponse(interview, `household.persons.${personId}`);
      return `Déplacements de **${person.nickname}** le ${formattedTripsDate}&nbsp;:`;
    },
    en: function(interview, path) {
      const householdSize      = surveyHelperNew.getResponse(interview, 'household.size', null);
      const formattedTripsDate = moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL');
      if (householdSize === 1)
      {
        return `Trips you made on${formattedTripsDate}&nbsp;:`;
      }
      const personId           = surveyHelperNew.getResponse(interview, '_activePersonId');
      const person: any             = surveyHelperNew.getResponse(interview, `household.persons.${personId}`);
      return `Trips made by **${person.nickname}** on ${formattedTripsDate}&nbsp;:`;
    }
  }
};

export const introButtonSaveTrip = {
  type: "text",
  containsHtml: true,
  align: 'center',
  text: {
    fr: `<p class="no-bottom-margin center _oblique">Si <strong>tous</strong> les modes de transport utilisés lors de ce déplacement ont été indiqués:</p>`,
    en: `<p class="no-bottom-margin center _oblique">If you selected <strong>all</strong> modes of transport used during this trip:</p>`
  }
};

export const buttonSaveTrip = {
  type: "button",
  color: "green",
  label: {
    fr: "Confirmer ce déplacement",
    en: "Confirm this trip"
  },
  hideWhenRefreshing: true,
  path: "buttonSaveTrip",
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction,
  saveCallback: function(callbacks: surveyHelperNew.InterviewUpdateCallbacks) {
    callbacks.startUpdateInterview("segments", {
      'responses._activeTripId': null
    });
  },
  conditional: function(interview, path) {
    const segments      = surveyHelperNew.getResponse(interview, path, {}, '../segments');
    const segmentsArray = Object.values(segments).sort((segmentA, segmentB) => {
      return segmentA['_sequence'] - segmentB['_sequence'];
    });
    const lastSegment   = segmentsArray[segmentsArray.length - 1];
    return [lastSegment && lastSegment.hasNextMode === false, undefined];
  }
};