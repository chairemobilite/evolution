/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import helper from '../helper';
import waterBoundaries  from '../waterBoundaries.json';
import { WidgetConfig } from 'evolution-frontend/lib/services/widgets';

export const personWorkOnTheRoad: WidgetConfig = {
  type: "question",
  path: "household.persons.{_activePersonId}.workOnTheRoad",
  inputType: "radio",
  datatype: "boolean",
  twoColumns: true,
  choices: [
    {
      value: true,
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: false,
      label: {
        fr: "Non",
        en: "No"
      }
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Travaillez-vous sur la route de manière régulière (${surveyHelperNew.getResponse(interview, path, null, '../gender') == 'female' ? "livreuse, représentante, conductrice, policière" : "livreur, représentant, chauffeur, policier"}, etc.)?`;
      }
      const person       = helper.getPerson(interview);
      const genderString = helper.getGenderString(person, "livreuse, représentante, conductrice, policière", "livreur, représentant, chauffeur, policier", "livreur/se, représentant(e), conducteur/trice, policier/ère", "livreur/se, représentant(e), conducteur/trice, policier/ère")
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} travaille sur la route de manière régulière (${genderString}, etc.)?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Do you work on the road on a regular basis (deliverer, representative, driver, police officer, etc.)?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} work on the road on a regular basis (deliverer, representative, driver, police officer, etc.)?`;
    }
  },
  conditional: function(interview, path) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return (!_isBlank(occupation) && helper.isWorker(occupation));
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return [
      {
        validation: _isBlank(value) && !_isBlank(occupation) && helper.isWorker(occupation),
        errorMessage: {
          fr: `Cette réponse est requise`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personWorkAtHomeAtLeastOnceAWeek = {
  type: "question",
  path: "household.persons.{_activePersonId}.workAtHomeAtLeastOnceAWeek",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
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
      value: 'dontKnow',
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Travaillez-vous à la maison au moins un jour par semaine?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} travaille à la maison au moins un jour par semaine?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Do you work at home at least one day per week?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} work at home at least one day per week?`;
    }
  },
  conditional: function(interview, path) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return (!_isBlank(occupation) && helper.isWorker(occupation));
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return [
      {
        validation: _isBlank(value) && !_isBlank(occupation) && helper.isWorker(occupation),
        errorMessage: {
          fr: `Cette réponse est requise`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personUsualWorkPlaceIsHome = {
  type: "question",
  path: "household.persons.{_activePersonId}.usualWorkPlaceIsHome",
  inputType: "radio",
  datatype: 'boolean',
  twoColumns: true,
  choices: [
    {
      value: true,
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: false,
      label: {
        fr: "Non",
        en: "No"
      }
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      if (householdSize === 1)
      {
        if (isOnTheRoadWorker === true)
        {
          return `Est-ce que le point de départ habituel de vos déplacements sur la route pour le travail est votre domicile?`;
        }
        return `Est-ce que votre lieu de travail habituel est votre domicile?`;
      }
      if (isOnTheRoadWorker === true)
      {
        return `Est-ce que le point de départ habituel des déplacements sur la route pour le travail de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} est le domicile?`;
      }
      return `Est-ce que le lieu de travail habituel de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} est le domicile?`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      if (householdSize === 1)
      {
        if (isOnTheRoadWorker === true)
        {
          return `Do you usually start your work-related trips from home?`;
        }
        return `Is home your usual work place?`;
      }
      if (isOnTheRoadWorker === true)
      {
        const person       = helper.getPerson(interview);
        const genderString = helper.getGenderString(person, 'her', 'his', 'their', 'his/her');
        return `Does ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} usually start ${genderString} work-related trips from home?`;
      }
      return `Is home ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}'s usual work place?`;
    }
  },
  conditional: function(interview, path) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return (!_isBlank(occupation) && helper.isWorker(occupation));
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return [
      {
        validation: _isBlank(value) && !_isBlank(occupation) && helper.isWorker(occupation),
        errorMessage: {
          fr: `Cette réponse est requise`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personWorkAtHomeNumberOfDaysPerWeek = {
  type: "question",
  path: "household.persons.{_activePersonId}.workAtHomeNumberOfDaysPerWeek",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: '0',
      label: {
        fr: "0 jour par semaine",
        en: "0 day per week"
      },
      conditional: false
    },
    {
      value: '1',
      label: {
        fr: "1 jour par semaine",
        en: "1 day per week"
      }
    },
    {
      value: '2',
      label: {
        fr: "2 jours par semaine",
        en: "2 days per week"
      }
    },
    {
      value: '3',
      label: {
        fr: "3 jours par semaine",
        en: "3 days per week"
      }
    },
    {
      value: '4',
      label: {
        fr: "4 jours par semaine",
        en: "4 days per week"
      }
    },
    {
      value: '5+',
      label: {
        fr: "5 jours par semaine ou plus",
        en: "5 days per week or more"
      }
    },
    {
      value: 'dontKnow',
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    }
  ],
  label: {
    fr: function (interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `En moyenne, combien de jours par semaine travaillez-vous à la maison?`;
      }
      const person       = helper.getPerson(interview);
      const genderString = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
      return `En moyenne, combien de jours par semaine ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} travaille-t-${genderString} à la maison?`;
    },
    en: function (interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `On average, how many days a week do you work at home?`;
      }
      return `On average, how many days a week does ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} work at home?`;
    }
  },
  conditional: function(interview, path) {
    const workAtHomeAtLeastOnceAWeek = surveyHelperNew.getResponse(interview, path, null, '../workAtHomeAtLeastOnceAWeek');
    let assignedValue = null;
    if (workAtHomeAtLeastOnceAWeek === 'no')
    {
      assignedValue = '0';
    }
    else if (workAtHomeAtLeastOnceAWeek === 'dontKnow')
    {
      assignedValue = 'dontKnow';
    }
    return [workAtHomeAtLeastOnceAWeek === 'yes', assignedValue];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value) && surveyHelperNew.getResponse(interview, path, null, '../workAtHomeAtLeastOnceAWeek') === 'yes',
        errorMessage: {
          fr: `Cette réponse est requise`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personUsualWorkPlaceName = {
  type: "question",
  inputType: "string",
  path: "household.persons.{_activePersonId}.usualWorkPlaceName",
  datatype: "string",
  twoColumns: false,
  label: {
    fr: function(interview, path) {
      const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      if (householdSize === 1)
      {
        return `Nom ou descriptif de votre lieu habituel de travail${isOnTheRoadWorker ? ' (lieu de départ de vos déplacements sur la route)' : ''}`;
      }
      return `Nom ou descriptif du lieu habituel de travail de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}${isOnTheRoadWorker ? ' (lieu de départ des déplacements sur la route)' : ''}`;
    },
    en: function(interview, path) {
      const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      if (householdSize === 1)
      {
        return `Name or description of your usual work place${isOnTheRoadWorker ? ' (departure location for work-related trips)' : ''}`;
      }
      return `${surveyHelperNew.getResponse(interview, path, null, '../nickname')}'s usual work place name or description${isOnTheRoadWorker ? ' (departure location for work-related trips)' : ''}`;
    },
  },
  conditional: function(interview, path) {
    const workAtHome = surveyHelperNew.getResponse(interview, path, null, '../usualWorkPlaceIsHome');
    return [workAtHome === false, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const workAtHome = surveyHelperNew.getResponse(interview, path, null, '../usualWorkPlaceIsHome');
    return [
      {
        validation: _isBlank(value) && (workAtHome === false),
        errorMessage: {
          fr: `Le nom ou descriptif du lieu habituel de travail est requis.`,
          en: `Usual work place's name or description is required.`
        }
      },
      {
        validation: !_isBlank(value) && (workAtHome === false) && value.length > 50,
        errorMessage: {
          fr: `Veuillez choisir un nom de moins de 50 caractères`,
          en: `Please choose a name of less than 50 characters`
        }
      }
    ];
  }
};

export const personUsualWorkPlaceGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "household.persons.{_activePersonId}.usualWorkPlace",
  datatype: "geojson",
  canBeCollapsed: true,
  autoCollapseWhenValid: true,
  containsHtml: true,
  label: {
    fr: function(interview, path) {
      const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      const pretext           = householdSize === 1 ? `Veuillez localiser sur la carte votre lieu habituel de travail${isOnTheRoadWorker ? ' (lieu de départ de vos déplacements sur la route)' : ''} sur la carte` : `Veuillez localiser le lieu habituel de travail de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}${isOnTheRoadWorker ? ' (lieu de départ des déplacements sur la route)' : ''}`;
      return `${pretext} <br />
      <span class="_pale _oblique">
        Vous pouvez naviguer, zoomer, cliquer sur la carte ou déplacer l'icône 
        pour préciser la localisation du lieu habituel de travail ou le localiser si sa position est erronée.
      </span>`;
    },
    en: function(interview, path) {
      const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
      const isOnTheRoadWorker = surveyHelperNew.getResponse(interview, path, null, '../workOnTheRoad');
      const pretext           = householdSize === 1 ? `Please locate your usual work place on the map${isOnTheRoadWorker ? ' (departure location for work-related trips)' : ''}` : `Please locate ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}'s usual work place on the map${isOnTheRoadWorker ? ' (departure location for work-related trips)' : ''}`;
      return `${pretext} <br />
      <span class="_pale _oblique">
      You can navigate, zoom, click on map or drag the icon marker
      to locate the usual work place if the location is wrong or not precise enough.
      </span>`;
    }
  },
  icon: {
    url: `/dist/images/activities_icons/workUsual_marker.svg`
  },
  defaultCenter: function(interview, path) {
    const homeCoordinates = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates', null);
    return homeCoordinates ? {lat: homeCoordinates[1], lon: homeCoordinates[0]} : config.mapDefaultCenter;
  },
  refreshGeocodingLabel: {
    fr: "Chercher la localisation à partir du nom",
    en: "Search location using the place name"
  },
  geocodingQueryString: function(interview, path) {
    return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([surveyHelperNew.getResponse(interview, path, null, '../usualWorkPlaceName')]);
  },
  conditional: function(interview, path) {
    const workAtHome = surveyHelperNew.getResponse(interview, path, null, '../usualWorkPlaceIsHome');
    return [workAtHome === false, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation: any = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    const geography: any  = surveyHelperNew.getResponse(interview, path, null);
    return [
      {
        validation: _isBlank(value) && helper.isWorker(occupation),
        errorMessage: {
          fr: `Le positionnement du lieu de travail habituel est requis.`,
          en: `Usual work place location is required.`
        }
      },
      {
        validation: geography && geography.properties.lastAction && geography.properties.lastAction === 'mapClicked' && geography.properties.zoom < 14,
        errorMessage: {
          fr: `Le positionnement du lieu n'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.`,
          en: `Location is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.`
        }
      },
      {
        validation: geography && turfBooleanPointInPolygon(geography, (waterBoundaries as any).features[0]),
        errorMessage: {
          fr: `Le lieu est dans une étendue d'eau ou est inaccessible. Veuillez vérifier la localisation.`,
          en: `Location is in water or is inaccessible. Please verify.`
        }
      }
    ];
  }
};

export const personUsualSchoolPlaceName = {
  type: "question",
  inputType: "string",
  path: "household.persons.{_activePersonId}.usualSchoolPlaceName",
  datatype: "string",
  twoColumns: false,
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Nom ou descriptif de votre lieu habituel d'études`;
      }
      return `Nom ou descriptif du lieu habituel d’études de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      if (householdSize === 1)
      {
        return `Name or description of your usual school place`;
      }
      return `${surveyHelperNew.getResponse(interview, path, null, '../nickname')}'s usual school place name or description`;
    }
  },
  conditional: function(interview, path) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return (!_isBlank(occupation) && helper.isStudent(occupation));
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    return [
      {
        validation: _isBlank(value) && helper.isStudent(occupation),
        errorMessage: {
          fr: `Le nom ou descriptif du lieu habituel d’études est requis.`,
          en: `Usual school place's name or description is required.`
        }
      },
      {
        validation: !_isBlank(value) && value.length > 50,
        errorMessage: {
          fr: `Veuillez choisir un nom de moins de 50 caractères`,
          en: `Please choose a name of less than 50 characters`
        }
      }
    ];
  }
};

export const personUsualSchoolPlaceGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "household.persons.{_activePersonId}.usualSchoolPlace",
  datatype: "geojson",
  canBeCollapsed: true,
  autoCollapseWhenValid: true,
  containsHtml: true,
  label: {
    fr: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const pretext       = householdSize === 1 ? `Veuillez localiser votre lieu habituel d'études sur la carte` : `Veuillez localiser le lieu habituel d’études de ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} sur la carte`;
      return `${pretext} <br />
      <span class="_pale _oblique">
        Vous pouvez naviguer, zoomer, cliquer sur la carte ou déplacer l'icône 
        pour préciser la localisation du lieu habituel d'études ou le localiser si sa position est erronée.
      </span>`;
    },
    en: function(interview, path) {
      const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
      const pretext       = householdSize === 1 ? `Please locate your usual school place on the map` : `Please locate ${surveyHelperNew.getResponse(interview, path, null, '../nickname')}'s usual school place on the map`;
      return `${pretext} <br />
      <span class="_pale _oblique">
      You can navigate, zoom, click on map or drag the icon marker
      to locate the usual school place if the location is wrong or not precise enough.
      </span>`;
    }
  },
  icon: {
    url: `/dist/images/activities_icons/school_marker.svg`
  },
  defaultCenter: function(interview, path) {
    const homeCoordinates = surveyHelperNew.getResponse(interview, 'home.geography.geometry.coordinates', null);
    return homeCoordinates ? {lat: homeCoordinates[1], lon: homeCoordinates[0]} : config.mapDefaultCenter;
  },
  refreshGeocodingLabel: {
    fr: "Chercher la localisation à partir du nom",
    en: "Search location using the place name"
  },
  geocodingQueryString: function(interview, path) {
    return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([surveyHelperNew.getResponse(interview, path, null, '../usualSchoolPlaceName')]);
  },
  conditional: function(interview, path) {
    const occupation           = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    //const usualSchoolPlaceName = surveyHelperNew.getResponse(interview, path, null, '../usualSchoolPlaceName');
    return (!_isBlank(occupation) && helper.isStudent(occupation));
  },
  validations: function(value, customValue, interview, path, customPath) {
    const occupation: any = surveyHelperNew.getResponse(interview, path, null, '../occupation');
    const geography: any  = surveyHelperNew.getResponse(interview, path, null);
    return [
      {
        validation: _isBlank(value) && helper.isStudent(occupation),
        errorMessage: {
          fr: `Le positionnement du lieu habituel d’études est requis.`,
          en: `Usual school place location is required.`
        }
      },
      {
        validation: geography && geography.properties.lastAction && geography.properties.lastAction === 'mapClicked' && geography.properties.zoom < 14,
        errorMessage: {
          fr: `Le positionnement du lieu n'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.`,
          en: `Location is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.`
        }
      },
      {
        validation: geography && turfBooleanPointInPolygon(geography, (waterBoundaries as any).features[0]),
        errorMessage: {
          fr: `Le lieu est dans une étendue d'eau ou est inaccessible. Veuillez vérifier la localisation.`,
          en: `Location is in water or is inaccessible. Please verify.`
        }
      }
    ];
  }
};

export const personNewPerson = {
  type: "question",
  inputType: "button",
  path: "_showNewPersonPopup",
  align: "center",
  datatype: "boolean",
  twoColumns: false,
  isModal: true,
  //containsHtml: true,
  label: {
    fr: function(interview, path) {
      const person = helper.getPerson(interview);
      if (person.age >= 16)
      {
        const genderString = helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle');
        return `Vous allez maintenant poursuivre l'entrevue pour **${person.nickname}**. Si ${person.nickname} est disponible, ${genderString} peut venir compléter ou vous pouvez répondre aux prochaines questions à sa place.`;
      }
      else
      {
        return `Vous allez maintenant poursuivre l'entrevue pour **${person.nickname}**.`;
      }
    },
    en: function(interview, path) {
      const person = helper.getPerson(interview);
      if (person.age >= 16)
      {
        const genderString = helper.getGenderString(person, 'she', 'he', 'they', 'they');
        const genderString2 = helper.getGenderString(person, 'her', 'him', 'them', 'them');
        return `You will now continue the interview for **${person.nickname}**. If ${person.nickname} is available, ${genderString} can come and continue the interview, or you can answer for ${genderString2}`;
      }
      else
      {
        return `You will now continue the interview for **${person.nickname}**.`;
      }
    }
  },
  choices: [
    {
      value: true,
      label: {
        fr: "Continuer",
        en: "Continue"
      },
      color: "green"
    }
  ],
  conditional: function(interview, path) {
    const showPopup = surveyHelperNew.getResponse(interview, '_showNewPersonPopup', false);
    return [showPopup === true, false];
  }
};

export const partTwoIntroText = {
  type: "text",
  align: 'center',
  containsHtml: true,
  text: {
    fr: function(interview) {
      const homeAddress    = surveyHelperNew.getResponse(interview, 'home.address', "");
      const householdSize  = surveyHelperNew.getResponse(interview, 'household.size', null);
      const homeCity       = surveyHelperNew.getResponse(interview, 'home.city', "");
      const homeRegion     = surveyHelperNew.getResponse(interview, 'home.region', "");
      const homePostalCode = surveyHelperNew.getResponse(interview, 'home.postalCode', "");
      const persons        = helper.getPersons(interview, true);
      return `
        <p>Lors de la première partie, vous avez fourni les informations suivantes:</p>
        <p class="no-bottom-margin">Addresse du domicile: <span class="_strong">${homeAddress}, ${homeCity}, ${homeRegion}, ${homePostalCode}</span></p>
        <p class="no-bottom-margin">Membres du ménage: <span class="_strong">${householdSize} personne${householdSize > 1 ? 's' : ''}</span></p>
        <ul>
          ${persons.map(function(person) { 
            return `<li class="no-bottom-margin">${!_isBlank(person.nickname) ? `<strong>${person.nickname}</strong> • `: ''}<em>${person.age} ans</em></li>`; 
          }).join('')}
        </ul>
      `;
    },
    en: function(interview) {
      const homeAddress    = surveyHelperNew.getResponse(interview, 'home.address', "");
      const householdSize  = surveyHelperNew.getResponse(interview, 'household.size', null);
      const homeCity       = surveyHelperNew.getResponse(interview, 'home.city', "");
      const homeRegion     = surveyHelperNew.getResponse(interview, 'home.region', "");
      const homePostalCode = surveyHelperNew.getResponse(interview, 'home.postalCode', "");
      const persons        = helper.getPersons(interview, true);
      return `
        <p>During the first part, you provided the following information:</p>
        <p class="no-bottom-margin">Home address: <span class="_strong">${homeAddress}, ${homeCity}, ${homeRegion}, ${homePostalCode}</span></p>
        <p class="no-bottom-margin">Household members: <span class="_strong">${householdSize} person${householdSize > 1 ? 's' : ''}</span></p>
        <ul>
          ${persons.map(function(person) { 
            return `<li class="no-bottom-margin">${!_isBlank(person.nickname) ? `<strong>${person.nickname}</strong> • `: ''}<em>${person.age} years old</em></li>`; 
          }).join('')}
        </ul>
      `;
    }
  }
};

export const partOneConfirmed = {
  type: "question",
  inputType: "button",
  path: "household.partOneConfirmed",
  align: "center",
  datatype: "string",
  twoColumns: false,
  containsHtml: true,
  label: {
    fr: "Confirmez-vous ces informations?",
    en: "Do you confirm these informations?"
  },
  choices: [
    {
      value: 'modify',
      label: {
        fr: "Modifier",
        en: "Modify"
      },
      color: "blue"
    },
    {
      value: 'confirm',
      label: {
        fr: "Confirmer",
        en: "Confirm"
      },
      color: "green"
    }
  ],
  saveCallback: function() {
    const partOneConfirmed = surveyHelperNew.getResponse(this.props.interview, 'household.partOneConfirmed', null);
    if (partOneConfirmed === 'confirm')
    {
      this.props.startUpdateInterview('partTwoIntro', {
        'responses._activeSection': 'selectPerson'
      });
    }
    else if (partOneConfirmed === 'modify')
    {
      this.props.startUpdateInterview('partTwoIntro', {
        'responses._activeSection': 'home'
      });
    }
  }
};

export const personDidTripsProfile = {
  type: "question",
  path: "household.persons.{_activePersonId}.didTripsOnTripsDate",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: "yes",
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: "no",
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
      },
      conditional: function(interview) {
        const person = helper.getPerson(interview);
        if (person.age < 16)
        {
          return false;
        }
        return config.acceptUnknownDidTrips === true;
      }
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Avez-vous effectué au moins un déplacement le ${helper.getFormattedTripsDate(interview)}?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} a effectué au moins un déplacement le ${helper.getFormattedTripsDate(interview)}?`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Did you make at least one trip on ${helper.getFormattedTripsDate(interview)}?`;
      }
      return `Did ${surveyHelperNew.getResponse(interview, path, null, '../nickname')} make at least one trip on ${helper.getFormattedTripsDate(interview)}?`;
    }
  },
  helpPopup: {
    title: {
      fr: "Quels déplacements inclure?",
      en: "Which trips must be included?"
    },
    content: {
      fr: function(interview) {
        return `
* **Inclure tout déplacement effectué pour le travail, les études, le magasinage, les loisirs, pour des raisons médicales, pour aller reconduire ou aller chercher/accompagner quelqu'un, ou pour tout autre motif**
* ~~Ne pas inclure les déplacements sans destination précise effectués en boucle comme aller prendre une marche ou promener le chien, à moins qu'ils comprennent un arrêt en chemin (dépanneur, épicerie, etc.)~~
`;
      },
      en: function(interview) {
        return `
* **Include any trip for work, study, shopping, recreation, medical reasons, to pick up or drive/accompany someone, or for any other reason**
* ~~Do not include trips without a specific destination, such as going for a walk or walking the dog, unless they include a stop along the way (convenience store, grocery store, etc.)~~
`;
      }
    }
  },
  conditional: function(interview, path) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    if (_isBlank(age) || (!_isBlank(age) && (age < 5 || !(age > 0)) )) { return [false, null]; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    return [
      {
        validation: _isBlank(value) && !_isBlank(age) && age >= 5,
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personDidTripsKnowTrips = {
  type: "question",
  path: "household.persons.{_activePersonId}.didTripsOnTripsDateKnowTrips",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: "yes",
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: "no",
      label: {
        fr: "Non",
        en: "No"
      }
    },
    {
      value: "proxy",
      label: {
        fr: "Je peux répondre pour cette personne",
        en: "I can respond for this person"
      }
    }
  ],
  label: {
    fr: function(interview, path) {
      const person       = helper.getPerson(interview);
      const genderString = helper.getGenderString(person, "elle", "il", "il/elle", "il/elle");
      return `Est-ce que ${person.nickname} est disponible pour répondre à la section sur les déplacements qu'${genderString} a effectués le ${helper.getFormattedTripsDate(interview)}?`;
    },
    en: function(interview, path) {
      const person       = helper.getPerson(interview);
      const genderString = helper.getGenderString(person, "she", "he", "they", "he/she");
      return `Is ${person.nickname} available to respond to the section about the trips ${genderString} made on ${helper.getFormattedTripsDate(interview)}?`;
    }
  },
  conditional: function(interview, path) {
    const person       = helper.getPerson(interview);
    const didTrips     = surveyHelperNew.getResponse(interview, path, null, '../didTripsOnTripsDate');
    const countPersons = helper.countPersons(interview);
    return [countPersons > 1 && person.age >= 16 && didTrips === 'yes', null];
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
