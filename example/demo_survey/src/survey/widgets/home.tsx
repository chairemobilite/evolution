/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import { TFunction } from 'i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { getHousehold } from 'evolution-common/lib/services/odSurvey/helpers';
import waterBoundaries  from '../waterBoundaries.json';

export const homeIntro = {
  type: "text",
  align: 'center',
  text: {
    fr: "Nous allons vous demander de compléter les informations suivantes concernant votre ménage et votre domicile:",
    en: "We will ask you to provide information about your household and your home:"
  }
};

export const interviewLanguage = {
  type: "question",
  path: "_language",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'fr',
      label: {
        fr: "Français",
        en: "French"
      }
    },
    {
      value: 'en',
      label: {
        fr: "Anglais",
        en: "English"
      }
    }
  ],
  label: {
    fr: "Langue d'entrevue",
    en: "Interview language"
  }
};

export const accessCode = {
  type: 'question',
  twoColumns: true,
  path: 'accessCode',
  inputType: "string",
  datatype: "string",
  containsHtml: true,
  keyboardInputMode: 'numeric',
  placeholder: "ex. 1234-5678",
  inputFilter: (input: string) => {
    input = input.replace("_", "-"); // change _ to -
    input = input.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
    // Get only the digits. If we have 8, we can automatically format the access code.
    const digits = input.replace(/\D+/g, '');
    if (digits.length === 8) {
        return digits.slice(0, 4) + "-" + digits.slice(4);
    }
    // Prevent entering more than 9 characters (8 digit access code and a dash)
    return input.slice(0, 9);
  },
  label: (t: TFunction) => t('survey:AccessCode')
}

export const householdSize = {
  type: 'question',
  inputType: "radioNumber",
  overMaxAllowed: true,
  valueRange: {min: 1, max: 3},
  path: 'household.size',
  twoColumns: true,
  label: {
    fr: "Combien de personnes habitent votre domicile de façon permanente, **y compris vous-même**, pendant la semaine?",
    en: "Including yourself, how many people live permanently in your household during the week?"
  },
  helpPopup: {
    title: {
      fr: "Qui inclure dans ce nombre?",
      en: "Who to include?"
    },
    content: {
      fr: function(interview) {
        return `
* **Vous devez vous inclure dans ce nombre**
* **Inclure les enfants en garde partagée s'ils étaient présents au domicile le ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} **
* **Inclure les chambreuses, chambreurs et colocataires, ainsi que tous ceux qui vivent en communauté domestique**
* ~~Ne pas inclure quelqu’un qui habite sous le même toit ou le même bâtiment, mais qui accède par une autre porte extérieure que vous~~
`;
      },
      en: function(interview) {
        return `
* **Include yourself in the count**
* **Include children in joint custody if they were present on ${moment(surveyHelperNew.getResponse(interview, 'tripsDate')).format('LL')} **
* **Include roomers and roommates**
* ~~Do not include those who live in the same building but access their dwelling from a separate exterior door~~
`;
      }
    }
  },
  validations: (value: number | undefined) => {
    return [
      {
        validation: (isNaN(Number(value)) || !Number.isInteger(Number(value))),
        errorMessage: {
          fr: `La taille du ménage est invalide.`,
          en: `Household size is invalid.`
        }
      },
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `La taille du ménage est requise.`,
          en: `Household size is required.`
        }
      },
      {
        validation: ((value as number) > 18),
        errorMessage: {
          fr: `La taille du ménage doit être au maximum 18.`,
          en: `Household size must be less than or equal to 18.`
        }
      },
      {
        validation: ((value as number) <= 0),
        errorMessage: {
          fr: `La taille du ménage doit être au moins de 1 (Vous devez vous inclure).`,
          en: `Household size must be at least 1 (You need to include yourself).`
        }
      }
    ];
  }
};

export const householdCarNumber = {
  type: "question",
  path: 'household.carNumber',
  twoColumns: true,
  inputType: "string",
  datatype: "integer",
  keyboardInputMode: 'numeric',
  containsHtml: true,
  label: {
    fr: `Combien de véhicules sont à la disposition d'un ou des membres de votre ménage?<br /><span class="_pale _oblique">Inscrivez "0" si aucun véhicule dans le ménage</span>`,
    en: `How many vehicles are available to one or more members of your household?<br /><span class="_pale _oblique">Write "0" if no vehicle in household</span>`
  },
  helpPopup: {
    title: {
      fr: "Quels véhicules inclure dans ce nombre?",
      en: "Which vehicles to include?"
    },
    content: {
      fr: function(interview) {
        return `
* **Inclure les automobiles, camions légers, camions, fourgonnettes, mobylettes, scooters et motos**
* **Inclure tous les véhicules fournis ou loués par un employeur que les membres de votre ménage utilisent pour aller au travail ou pour des raisons personnelles**
* ~~Ne pas inclure les véhicules d'autopartage (Communauto, Auto-mobile, Car2Go)~~
* ~~Ne pas inclure un véhicule stationné au lieu de travail et utilisé exclusivement pour le travail~~
* ~~Ne pas inclure les vélos ou vélos électriques~~
* ~~Ne pas inclure les véhicules remisés ou de collection utilisés rarement~~
`;
      },
      en: function(interview) {
        return `
* **Include cars, light trucks, trucks, vans, scooters and motorcycles**
* **Include all vehicles made available or leased by an employer that members of your household use to go to work or for personal reasons**
* ~~Do not include carsharing vehicles (Communauto, Auto-mobile, Car2Go)~~
* ~~Do not include a vehicle parked at work and used exclusively for work purposes~~
* ~~Do not include bicycles or electric bicycles~~
* ~~Do not include stowed vehicles or collection vehicles used rarely~~

`;
      }
    }
  },
  validations: function(value, customValue, interview, path, customPath) {
    const householdSize: any = getHousehold(interview).size;
    return [
      {
        validation: (isNaN(Number(value)) || !Number.isInteger(Number(value))),
        errorMessage: {
          fr: `Le nombre de véhicules est invalide.`,
          en: `The number of vehicles is invalid.`
        }
      },
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le nombre de véhicules est requis.`,
          en: `The number of vehicles is required.`
        }
      },
      {
        validation: (value > 13),
        errorMessage: {
          fr: `Le nombre de véhicules doit être au maximum 13.`,
          en: `The number of vehicle must be less than or equal to 13.`
        }
      },
      {
        validation: (value < 0),
        errorMessage: {
          fr: `Le nombre de véhicules doit être au moins de 0.`,
          en: `The number of vehicles must be at least 0.`
        }
      },
      {
        validation: (!_isBlank(householdSize) && !isNaN(Number(householdSize)) && (Number.isInteger(Number(value)) && (Number(value))/householdSize > 3)),
        errorMessage: {
          fr: `Le nombre de véhicules est trop élevé. Ne pas inclure les véhicules de collection ou les véhicules qui ne sont pas utilisés régulièrement.`,
          en: `The number of vehicles is too high. Do not include collection vehicles or vehicles that are not used on a regular basis.`
        }
      }
    ];
  }
};

export const homeDwellingType = {
  type: 'question',
  path: 'home.dwellingType',
  inputType: 'select',
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Dans quel type d'habitation ou de propriété vivez-vous?",
    en: "In what type of dwelling or property do you live?"
  },
  hasGroups: true,
  choices: [
    {
      groupShortname: "tenant",
      groupLabel: {
        fr: "Mon ménage est locataire du domicile",
        en: "My household is tenant of the property"
      },
      choices: [
        {
          value: "tenantSingleDetachedHouse",
          label: {
            fr: "Locataire | Maison individuelle",
            en: "Tenant | Single detached house"
          }
        },
        {
          value: "tenantSemiDetachedHouse",
          label: {
            fr: "Locataire | Maison jumelée (semi-détaché)",
            en: "Tenant | Semi detached house"
          }
        },
        {
          value: "tenantRowTownhouse",
          label: {
            fr: "Locataire | Maison en rangée",
            en: "Tenant | Row/Townhouse"
          }
        },
        {
          value: "tenantApartmentCondo",
          label: {
            fr: "Locataire | Appartement ou Condo",
            en: "Tenant | Apartment or Condo"
          }
        },
        {
          value: "tenantPlex",
          label: {
            fr: "Locataire | Plex",
            en: "Tenant | Plex"
          }
        },
        {
          value: "tenantOther",
          label: {
            fr: "Locataire | Autre (maison mobile, chalet...)",
            en: "Tenant | Other (caravan, cottage...)"
          }
        }
      ]
    },
    {
      groupShortname: "owner",
      groupLabel: {
        fr: "Mon ménage est propriétaire du domicile",
        en: "My household owns the property"
      },
      choices: [
        {
          value: "ownerSingleDetachedHouse",
          label: {
            fr: "Propriétaire | Maison individuelle",
            en: "Owner | Single detached house"
          }
        },
        {
          value: "ownerSemiDetachedHouse",
          label: {
            fr: "Propriétaire | Maison jumelée (semi-détaché)",
            en: "Owner | Semi detached house"
          }
        },
        {
          value: "ownerRowTownhouse",
          label: {
            fr: "Propriétaire | Maison en rangée",
            en: "Owner | Row/Townhouse"
          }
        },
        {
          value: "ownerApartmentCondo",
          label: {
            fr: "Propriétaire | Appartement ou Condo",
            en: "Owner | Apartment or Condo"
          }
        },
        {
          value: "ownerPlex",
          label: {
            fr: "Propriétaire | Plex",
            en: "Owner | Plex"
          }
        },
        {
          value: "ownerOther",
          label: {
            fr: "Propriétaire | Autre (maison mobile, chalet...)",
            en: "Owner | Other (caravan, cottage...)"
          }
        }
      ]
    },
    {
      groupShortname: 'other',
      groupLabel: {
        fr: "",
        en: ""
      }, choices: [
        {
          value: "dontKnow",
          label: {
            fr: "Je ne sais pas",
            en: "I don’t know"
          }
        }
      ]
    }
  ],
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le type d'habitation est requis.`,
          en: `Dwelling type is required.`
        }
      }
    ];
  }
};

export const homeAddress = {
  type: "question",
  inputType: "string",
  path: "home.address",
  datatype: "string",
  //joinWith: 'homeApartmentNumber',
  twoColumns: true,
  label: {
    fr: "Adresse",
    en: "Address"
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez spécifier votre adresse.`,
          en: `Please specify your address.`
        }
      }
    ];
  }
};

export const homeApartmentNumber = {
  type: "question",
  inputType: "string",
  containsHtml: true,
  path: "home.apartmentNumber",
  joinWith: 'homeAddress',
  datatype: "string",
  twoColumns: true,
  label: {
    fr: '<p>Numéro d\'appartement<br /><span class="_em _pale">Laisser vide si aucun</span></p>',
    en: 'Apartment number<br /><span class="_em _pale">Leave empty if none</span>'
  }
};

export const homeCity = {
  type: "question",
  inputType: "string",
  path: "home.city",
  twoColumns: true,
  datatype: "string",
  joinWith: "homeRegion",
  label: {
    fr: "Ville",
    en: "City"
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez spécifier votre ville.`,
          en: `Please specify your city.`
        }
      }
    ];
  }
};

export const homeRegion = {
  type: "question",
  inputType: "string",
  path: "home.region",
  datatype: "string",
  twoColumns: true,
  joinWith: "homeCountry",
  defaultValue: "Québec",
  label: {
    fr: "Province",
    en: "Province"
  }
};

export const homeCountry = {
  type: "question",
  inputType: "string",
  path: "home.country",
  datatype: "string",
  twoColumns: true,
  defaultValue: "Canada",
  joinWith: 'homePostalCode',
  label: {
    fr: "Pays",
    en: "Country"
  }
};

export const homePostalCode = {
  type: "question",
  inputType: "string",
  path: "home.postalCode",
  datatype: "string",
  textTransform: "uppercase",
  twoColumns: true,
  label: {
    fr: "Code postal",
    en: "Postal code"
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez spécifier votre code postal.`,
          en: `Please specify your postal code.`
        }
      },
      {
        validation: !(/^[GHJKghjk][0-9][A-Za-z]( )?[0-9][A-Za-z][0-9]\s*$/).test(value),
        errorMessage: {
          fr: `Le code postal est invalide. Vous devez résider au Québec pour compléter ce questionnaire`,
          en: `Postal code is invalid. You need to live in Quebec to fill this questionnaire.`
        }
      }
    ];
  }
};

export const homeGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "home.geography",
  datatype: "geojson",
  canBeCollapsed: true,
  autoCollapseWhenValid: false, // not yet implemented?
  containsHtml: true,
  label: {
    fr: `<p>Positionnement du domicile<br />
        <span class="_pale _oblique">
          Vous pouvez naviguer, zoomer, cliquer sur la carte ou déplacer l'icône 
          pour préciser la localisation de votre domicile ou le localiser si sa position est erronée 
          ou si l'adresse n'a pas été reconnue.
        </span></p>`,
    en: `<p>Home location<br />
        <span class="_pale _oblique">
          You can navigate, zoom, click on map or drag the icon marker
          to locate your home if the address was not recognized or if the location is wrong or not precise enough.
        </span></p>`
  },
  icon: {
    url: `/dist/images/activities_icons/home_marker.svg`,
    size: [80, 80]
  },
  defaultCenter: config.mapDefaultCenter,
  refreshGeocodingLabel: {
    fr: "Chercher la localisation à partir de l'adresse",
    en: "Search location using provided address"
  },
  geocodingQueryString: function(interview) {
    const address     = surveyHelperNew.getResponse(interview, 'home.address', null) ;
    const city        = surveyHelperNew.getResponse(interview, 'home.city', null);
    const region      = surveyHelperNew.getResponse(interview, 'home.region', null);
    const postalCode  = surveyHelperNew.getResponse(interview, 'home.postalCode', null);
    const country     = surveyHelperNew.getResponse(interview, 'home.country', null);
    return surveyHelperNew.formatGeocodingQueryStringFromMultipleFields([address, city, region, postalCode, country]);
  },
  validations: function(value, customValue, interview, path, customPath) {
    const geography: any  = surveyHelperNew.getResponse(interview, path, null);
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le positionnement du domicile est requis.`,
          en: `Home location is required.`
        }
      },
      {
        validation: geography && geography.properties.lastAction && geography.properties.lastAction === 'mapClicked' && geography.properties.zoom < 14,
        errorMessage: {
          fr: `Le positionnement de votre domicile n'est pas assez précis.  Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l'icône.`,
          en: `Location of your home is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.`
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
  },
  conditional: function(interview, path) {
    const address     = surveyHelperNew.getResponse(interview, 'home.address', null) ;
    const city        = surveyHelperNew.getResponse(interview, 'home.city', null);
    const postalCode  = surveyHelperNew.getResponse(interview, 'home.postalCode', null);
    return !_isBlank(address && city) || !_isBlank(postalCode);
  }
};

