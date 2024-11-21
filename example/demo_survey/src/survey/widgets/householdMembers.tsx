/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faMale } from '@fortawesome/free-solid-svg-icons/faMale';
import { faFemale } from '@fortawesome/free-solid-svg-icons/faFemale';
import { faChild } from '@fortawesome/free-solid-svg-icons/faChild';
import { faPortrait } from '@fortawesome/free-solid-svg-icons/faPortrait';
import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import { TFunction } from 'i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import helper from '../helper';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import waterBoundaries  from '../waterBoundaries.json';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { InterviewUpdateCallbacks, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { GroupConfig } from 'evolution-common/lib/services/widgets';

const personsWidgets = [
    'personNickname',
    'personAge',
    'personGender',
    'personOccupation',
    'personDrivingLicenseOwnership',
    'personTransitPassOwner',
    'personTransitPasses',
    'personCarsharingMember',
    'personBikesharingMember',
    'personHasDisability',
    'personCellphoneOwner'
];
if (config.isPartTwo !== true)
{
    personsWidgets.push("personDidTrips");
}

export const householdMembers: GroupConfig = {
  type: "group",
  path: 'household.persons',
  deleteConfirmPopup: {
    content: {
        fr: 'supprimer',
        en: 'delete'
    }
  },
  title: {
    fr: "Membres du ménage",
    en: "Household members"
  },
  name: {
    fr: function(groupedObject: any, sequence) { return `Personne ${sequence || groupedObject['_sequence']} ${groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''}`; },
    en: function(groupedObject: any, sequence) { return `Person ${sequence || groupedObject['_sequence']} ${groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''}`; }
  },
  showGroupedObjectDeleteButton: function(interview, path) { 
    const countPersons = helper.countPersons(interview);
    if (config.isPartTwo === true)
    {
      return countPersons > 1;
    }
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null) as number;
    return countPersons > householdSize;
  },
  showGroupedObjectAddButton: function(interview, path) {
    //const hasGroupedObjects = Object.keys(_get(interview, `groups.householdMembers`, {})).length > 0;
    //const householdSize     = surveyHelperNew.getResponse(interview, 'household.size', null);
    //const persons           = surveyHelperNew.getResponse(interview, path, {});
    return true;//hasGroupedObjects && Object.keys(persons).length < householdSize;
  },
  groupedObjectAddButtonLabel: {
    fr: "Ajouter une personne manquante",
    en: "Add a missing person"
  },
  addButtonSize: 'small' as const,
  widgets: personsWidgets
};

export const personAge = {
  type: "question",
  path: "age",
  inputType: "string",
  inputFilter: (input: string) => input.replace(/\D/g, ''), // Remove everything but numbers
  datatype: "integer",
  twoColumns: true,
  containsHtml: true,
  label: (t: TFunction, interview) => {
    const householdSize = helper.countPersons(interview);
    return t('survey:Age', { count: householdSize });
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: (t: TFunction) => t('survey:validation:AgeRequired')
      },
      {
        validation: (isNaN(Number(value)) || !Number.isInteger(Number(value))),
        errorMessage: {
          fr: `L'âge est invalide.`,
          en: `Age is invalid.`
        }
      },
      {
        validation: (value < 0),
        errorMessage: {
          fr: `L'âge doit être au moins de 0.`,
          en: `Age must be at least 0.`
        }
      },
      {
        validation: (value > 115),
        errorMessage: {
          fr: `L'âge est trop élevé.`,
          en: `Age is too high.`
        }
      }
    ];
  }
};

export const personNickname = {
  type: "question",
  path: "nickname",
  twoColumns: true,
  inputType: "string",
  datatype: "string",
  label: {
    fr: "Nom ou surnom vous permettant d'identifier cette personne pour la suite de l'entrevue",
    en: "Nickname or name which will allow you to identify this person during the interview"
  },
  conditional: function(interview, path) {
    const householdSize = helper.countPersons(interview);
    return [householdSize !== 1, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `L'identifiant est requis`,
          en: `The identifier is required.`
        }
      },
      {
        validation: !_isBlank(value) && value.length > 30,
        errorMessage: {
          fr: `Veuillez choisir un nom ou surnom de moins de 30 caractères`,
          en: `Please choose an identifier of less than 30 characters`
        }
      }
    ];
  }
};

export const personGender = {
  type: "question",
  path: "gender",
  twoColumns: true,
  customPath: "genderCustom",
  customChoice: "custom",
  inputType: "radio",
  datatype: "string",
  label: {
    fr: "Sexe",
    en: "Gender"
  },
  choices: [
    {
      value: 'female',
      internalId: 2,
      label: (t: TFunction) => t('survey:Female')
    },
    {
      value: 'male',
      internalId: 1,
      label: {
        fr: "Homme",
        en: "Male"
      }
    },
    {
      value: 'custom',
      internalId: 3,
      label: (t:TFunction, interview, path) => {
        const householdSize = helper.countPersons(interview);
        const nickname      = surveyHelperNew.getResponse(interview, path, "Cette personne", '../nickname');
        return t('survey:gender:Custom', { count: householdSize, nickname });
      }
    }
  ],
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Le sexe est requis.`,
          en: `Gender is required.`
        },
      },
      {
        validation: _isBlank(customValue) && surveyHelperNew.getResponse(interview, path, null) === 'custom',
        errorMessage: {
          fr: `L'identifiant du sexe est requis.`,
          en: `Gender identification is required.`
        }
      }
    ];
  }
};

export const personOccupation = {
  type: 'question',
  path: 'occupation',
  inputType: 'select',
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Occupation principale",
    en: "Main occupation"
  },
  choices: [
    {
      value: 'fullTimeWorker',
      internalId: 1,
      label: {
        fr: 'Travail à temps plein (30h et plus/semaine)',
        en: 'Employed full-time (30h and more/week)'
      },
      conditional: function(interview, path) {
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 15
      }
    },
    {
      value: 'partTimeWorker',
      internalId: 2,
      label: {
        fr: 'Travail à temps partiel (moins de 30h/semaine)',
        en: 'Employed part-time (less than 30h/week)'
      },
      conditional: function(interview, path) {
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 15
      }
    },
    {
      value: 'fullTimeStudent',
      internalId: 3,
      label: {
        fr: function(interview, path) {
          return surveyHelperNew.getResponse(interview, path, null, "../age") < 12 ? 'École' : 'Études à temps plein'
        },
        en: function(interview, path) {
          return surveyHelperNew.getResponse(interview, path, null, "../age") < 12 ? 'Schoolchild/Student' : 'Full-time student'
        },
      },
      conditional: function(interview, path) {
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 5
      }
    },
    {
      value: 'partTimeStudent',
      internalId: 3,
      label: {
        fr: 'Études à temps partiel',
        en: 'Part-time student'
      },
      conditional: function(interview, path) {
        if (config.includePartTimeStudentOccupation === false) { return false; }
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 16
      }
    },
    {
      value: 'workerAndStudent',
      //internalId: we need to deal with this using trips declared as work and/or school, see parsers
      label: {
        fr: 'Travail et études',
        en: 'Employed and student'
      },
      conditional: function(interview, path) {
        if (config.includeWorkerAndStudentOccupation === false) { return false; }
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 16
      }
    },
    {
      value: 'retired',
      internalId: 4,
      label: {
        fr: "Retraite",
        en: "Retired",
      },
      conditional: function(interview, path) {
        return surveyHelperNew.getResponse(interview, path, null, "../age") >= 40
      }
    },
    {
      value: 'atHome',
      internalId: 7,
      label: {
        fr: "À la maison",
        en: "At home",
      }
    },
    {
      value: 'other',
      internalId: 5,
      label: {
        fr: "Autre",
        en: "Other",
      }
    },
    {
      value: 'nonApplicable',
      internalId: 6,
      label: {
        fr: 'Non applicable',
        en: 'Non applicable'
      },
      hidden: true
    }
  ],
  conditional: function(interview, path) {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (person && _isBlank(person.age) || !(person.age >= 0)) { return [false, null]; }
    else if (person && person.age < 5) { return [false, 'nonApplicable']; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    return [
      {
        validation: _isBlank(value) && !_isBlank(age) && age >= 5,
        errorMessage: {
          fr: `L'occupation principale est requise.`,
          en: `The main occupation is required.`
        }
      }
    ];
  }
};

export const personTransitPassOwner = {
  type: "question",
  path: "transitPassOwner",
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
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Possédez-vous un titre mensuel ou annuel de transport collectif valide ce mois-ci?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} possède un titre mensuel ou annuel de transport collectif valide ce mois-ci?`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Do you have a monthly or annual transit pass that is valid for the current month?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} have a monthly or annual transit pass that is valid for the current month?`;
    }
  },
  conditional: function(interview, path) {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (person && _isBlank(person.age) || !(person.age > 0)) { return [false, null]; }
    else if (person && person.age < 5) { return [false, 'nonApplicable']; }
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

export const personTransitPasses = {
  type: "question",
  path: "transitPasses",
  inputType: "multiselect",
  multiple: true,
  datatype: "string",
  twoColumns: false,
  choices: [
    {
      value: 'opusSTM',
      internalId: 3,
      label: {
        fr: "Opus STM (Montréal)",
        en: "Opus STM (Montreal)"
      }
    },
    {
      value: 'opusRTL',
      internalId: 4,
      label: {
        fr: "Opus RTL (Longueuil)",
        en: "Opus RTL (Longueuil)"
      }
    },
    {
      value: 'opusSTL',
      internalId: 5,
      label: {
        fr: "Opus STL (Laval)",
        en: "Opus STL (Laval)"
      }
    },
    {
      value: 'opusTRAM',
      internalId: 1,
      label: {
        fr: "Opus TRAM",
        en: "Opus TRAM"
      }
    },
    {
      value: 'opusTRAIN',
      internalId: 2,
      label: {
        fr: "Opus TRAIN",
        en: "Opus TRAIN"
      }
    },
    {
      value: 'opusEXO',
      internalId: 6,
      label: {
        fr: "Opus RTM/EXO/CIT (Couronnes)",
        en: "Opus RTM/EXO/CIT (Suburbs)"
      }
    },
    {
      value: 'other',
      internalId: 9,
      label: {
        fr: "Autre",
        en: "Other"
      }
    },
    {
      value: 'dontKnow',
      internalId: 10,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: 'nonApplicable',
      internalId: 8,
      hidden: true,
      label: {
        fr: "Non applicable",
        en: "Non applicable"
      }
    },
    {
      value: 'none',
      internalId: 9,
      hidden: true,
      label: {
        fr: "Aucun",
        en: "None"
      }
    }
  ],
  label: {
    fr: function(interview, path) { 
      const person        = surveyHelperNew.getResponse(interview, path, null, '../');
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Quel(s) titre(s) mensuel(s) ou annuel(s) de transport collectif détenez-vous?`;
      }
      return `Quel(s) titre(s) mensuel(s) ou annuel(s) de transport collectif ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} détient-${helper.getGenderString(person, 'elle', 'il', 'il/elle', 'il/elle')}?`;
    },
    en: function(interview, path) { 
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Which monthly or annual transit pass(es) do you have?`;
      }
      return `Which monthly or annual transit pass(es) does ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} have?`;
    }
  },
  conditional: function(interview, path) {
    const transitPassOwner = surveyHelperNew.getResponse(interview, path, null, '../transitPassOwner');
    let assignedValue = [];
    return [transitPassOwner === 'yes', assignedValue];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const transitPassOwner = surveyHelperNew.getResponse(interview, path, null, '../transitPassOwner');
    return [
      {
        validation: _isBlank(value) && transitPassOwner === 'yes',
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personCellphoneOwner = {
  type: "question",
  path: "cellphoneOwner",
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
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Possédez-vous un téléphone cellulaire avec un forfait actif?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} possède un téléphone cellulaire avec un forfait actif?`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Do you have a cellphone with an active plan/package?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} have a cellphone with an active plan/package?`;
    }
  },
  conditional: function(interview, path) {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (person && _isBlank(person.age) || !(person.age > 0)) { return [false, null]; }
    else if (person && person.age < 12) { return [false, 'nonApplicable']; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    return [
      {
        validation: _isBlank(value) && !_isBlank(age) && age >= 12,
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personDrivingLicenseOwnership = {
  type: "question",
  path: "drivingLicenseOwnership",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'yes',
      internalId: 1,
      label: {
        fr: "Oui",
        en: "Yes"
      }
    },
    {
      value: 'no',
      internalId: 2,
      label: {
        fr: "Non",
        en: "No"
      }
    },
    {
      value: 'dontKnow',
      internalId: 3,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    }
  ],
  label: {
    fr: function(interview, path) { 
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Possédez-vous un permis de conduire?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} possède un permis de conduire?`;
    },
    en: function(interview, path) { 
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Do you have a driver's license?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} have a driver's license?`;
    }
  },
  conditional: function(interview, path) {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (person && _isBlank(person.age) || !(person.age > 0)) { return [false, null]; }
    else if (person && person.age < 16) { return [false, 'nonApplicable']; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    return [
      {
        validation: _isBlank(value) && !_isBlank(age) && age >= 16,
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personCarsharingMember = {
  type: "question",
  path: "carsharingMember",
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
    },
    {
      value: 'nonApplicable',
      label: {
        fr: "Non applicable (pas de permis de conduire)",
        en: "Non applicable (no driver's license)"
      },
      hidden: true
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Êtes-vous membre d'un service d'autopartage (Communauto, Auto-mobile ou Car2Go)?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} est membre d'un service d'autopartage (Communauto, Auto-mobile ou Car2Go)?`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Are you a member of a carsharing service (Communauto, Auto-mobile or Car2Go)?`;
      }
      return `Is ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} a member of a carsharing service (Communauto, Auto-mobile or Car2Go)?`;
    }
  },
  conditional: function(interview, path) {
    const drivingLicenseOwnership = surveyHelperNew.getResponse(interview, path, null, '../drivingLicenseOwnership');
    if (_isBlank(drivingLicenseOwnership)) { return [false, null]; }
    if (!_isBlank(drivingLicenseOwnership) && drivingLicenseOwnership !== 'yes') { return [false, 'nonApplicable']; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const drivingLicenseOwnership = surveyHelperNew.getResponse(interview, path, null, '../drivingLicenseOwnership');
    return [
      {
        validation: _isBlank(value) && drivingLicenseOwnership === 'yes',
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personBikesharingMember = {
  type: "question",
  path: "bikesharingMember",
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
    },
    {
      value: 'nonApplicable',
      label: {
        fr: "Non applicable (trop jeune)",
        en: "Non applicable (too young)"
      },
      hidden: true
    }
  ],
  label: {
    fr: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Êtes-vous membre d'un service de vélopartage (BIXI ou autre)?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} est membre d'un service de vélopartage (BIXI ou autre)?`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Are you a member of a bikesharing service (BIXI or other)?`;
      }
      return `Is ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} a member of a bikesharing service (BIXI or other)?`;
    }
  },
  conditional: function(interview, path) {
    const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
    if (person && _isBlank(person.age) || !(person.age > 0)) { return [false, null]; }
    else if (person && person.age < 14) { return [false, 'nonApplicable']; }
    return [true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    const age = surveyHelperNew.getResponse(interview, path, null, '../age');
    return [
      {
        validation: _isBlank(value) && !_isBlank(age) && age >= 14,
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }
};

export const personHasDisability = {
  type: "question",
  path: "hasDisability",
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
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Avez-vous une incapacité physique ou intellectuelle permanente qui influence ou limite vos déplacements quotidiens?`;
      }
      return `Est-ce que ${surveyHelperNew.getResponse(interview, path, 'cette personne', '../nickname')} a une incapacité physique ou intellectuelle permanente qui influence ou limite ses déplacements quotidiens?`; 
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Do you have a permanent physical or intellectual disability that influences or limits your daily travel?`;
      }
      return `Does ${surveyHelperNew.getResponse(interview, path, 'this person', '../nickname')} have a permanent physical or intellectual disability that influences or limits his/her daily travel?`; 
    }
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

export const personDidTrips = {
  type: "question",
  path: "didTripsOnTripsDate",
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
      conditional: (config.acceptUnknownDidTrips === true ? true : false)
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

export const householdNoMemberOlderThan16YearsOld = {
  type: "question",
  inputType: "button",
  path: "household.noMemberOlderThan16YearsOld",
  align: "center",
  datatype: "boolean",
  twoColumns: false,
  isModal: true,
  containsHtml: true,
  label: {
    fr: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `Vous devez avoir au moins 16 ans pour répondre à ce questionnaire.`;
      }
      return `Au moins un membre de votre ménage doit avoir 16 ans ou plus pour répondre à ce questionnaire. Veuillez vérifier les âges.`;
    },
    en: function(interview, path) {
      const householdSize = helper.countPersons(interview);
      if (householdSize === 1)
      {
        return `You must be at least 16 years old to respond to this survey.`;
      }
      return `At least one member of your household must be 16 years old or older to respond to this survey. Please verify ages.`;
    }
  },
  choices: [
    {
      value: 'seenPopup',
      label: {
        fr: "OK",
        en: "OK"
      },
      color: "blue"
    }
  ],
  conditional: function(interview, path) {
    const persons                   = helper.getPersons(interview);
    let   allPersonHaveAge          = true;
    let   atLeastOnePerson16OrOlder = false;
    for (const personId in persons)
    {
      const person = persons[personId];
      if (!(person.age >= 0))
      {
        allPersonHaveAge = false;
      }
      if (person.age >= 16)
      {
        atLeastOnePerson16OrOlder = true;
      }
    }
    return [allPersonHaveAge && !atLeastOnePerson16OrOlder, null];
  }
};

export const buttonSaveNextSectionHouseholdMembers = {
  type: "button",
  path: "buttonSaveNextSection",
  color: "green",
  label: {
    fr: "Sauvegarder et continuer",
    en: "Save and continue"
  },
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  confirmPopup: {
    content: {
      fr: function(interview, path) {
        const householdSize = helper.countPersons(interview);
        if (householdSize === 1)
        {
          return `Vous devez avoir au moins 16 ans pour répondre à ce questionnaire.`;
        }
        return `Au moins un membre de votre ménage doit avoir 16 ans ou plus pour répondre à ce questionnaire. Veuillez vérifier les âges.`;
      },
      en: function(interview, path) {
        const householdSize = helper.countPersons(interview);
        if (householdSize === 1)
        {
          return `You must be at least 16 years old to respond to this survey.`;
        }
        return `At least one member of your household must be 16 years old or older to respond to this survey. Please verify ages.`;
      }
    },
    showConfirmButton: false,
    cancelButtonColor: 'blue',
    cancelButtonLabel: {
      fr: "OK",
      en: "OK"
    },
    conditional: function(interview) {
      const persons                     = helper.getPersons(interview);
      let   allPersonHaveAge            = true;
      let   atLeastOnePersonOlderThan16 = false;
      for (const personId in persons)
      {
        const person = persons[personId];
        if (!(person.age >= 0))
        {
          allPersonHaveAge = false;
        }
        if (person.age >= 16)
        {
          atLeastOnePersonOlderThan16 = true;
        }
      }
      return allPersonHaveAge && !atLeastOnePersonOlderThan16;
    }
  },
  saveCallback: function(callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string, user?: CliUser) {
    
    const personsCount  = helper.countPersons(interview);
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
    if (householdSize !== personsCount)
    {
      callbacks.startUpdateInterview('householdMembers', {
        [`responses.household.size`]: personsCount,
        [`responses._activeSection`]: 'selectPerson'
      });
    }
    else
    {
      callbacks.startUpdateInterview('householdMembers', {
        [`responses._activeSection`]: 'selectPerson'
      });
    }
    //return null;
  },
  action: surveyHelper.validateButtonAction
};

export const selectPerson = {
  type: "question",
  path: "_activePersonId",
  twoColumns: false,
  sameLine: false,
  inputType: "radio",
  datatype: "string",
  label: {
    fr: "Pour continuer l’entrevue, veuillez sélectionner un membre du ménage",
    en: "To continue the interview, please select a household member"
  },
  choices: function(interview) {
    const persons = helper.getPersons(interview);
    return Object.keys(persons).filter((personId) => {
      const person = persons[personId];
      return person.age >= 5;
    }).map((personId, index) => {
      let icon = faPortrait;
      if (persons[personId].age < 15)
      {
        icon = faChild;
      }
      else if (persons[personId].gender == 'male')
      {
        icon = faMale;
      }
      else if (persons[personId].gender == 'female')
      {
        icon = faFemale;
      }
      return {
        value: personId,
        label: {
          fr: `<div style={{display: 'flex', alignItems: 'center', fontSize: '150%', fontWeight: 300}}><FontAwesomeIcon icon={icon} className="faIconLeft" style={{width: '4rem', height: '4rem'}} />Personne ${index+1} • ${persons[personId].nickname} (${persons[personId].age} ans)}</div>`,
          en: `<div style={{display: 'flex', alignItems: 'center', fontSize: '150%', fontWeight: 300}}><FontAwesomeIcon icon={icon} className="faIconLeft" style={{width: '4rem', height: '4rem'}} />Person ${index+1} • ${persons[personId].nickname} (${persons[personId].age} years old)}</div>`
        }
      }
    });
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: _isBlank(value),
        errorMessage: {
          fr: `Veuillez sélectionner une personne pour poursuivre.`,
          en: `Please select a person to continue.`
        }
      }
    ];
  }
};

export const buttonSelectPersonConfirm = {
  type: "button",
  color: "green",
  label: {
    fr: "Sélectionner cette personne et continuer",
    en: "Select this person and continue"
  },
  path: "buttonSelectPersonConfirm",
  hideWhenRefreshing: true,
  icon: faCheckCircle,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const groupedPersonWorkOnTheRoad = {
  type: "question",
  path: "workOnTheRoad",
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
    fr: "Travaillez-vous sur la route de manière régulière?",
    en: "Work on the road on a regular basis?"
  },
  conditional: function(interview, path) {
    return true;
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

export const groupedPersonUsualWorkPlaceIsHome = {
  type: "question",
  path: "usualWorkPlaceIsHome",
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
    fr: "Lieu de travail habituel est le domicile?",
    en: "Usual work place is home?"
  },
  conditional: function(interview, path) {
    return true;
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

export const groupedPersonUsualWorkPlaceName = {
  type: "question",
  inputType: "string",
  path: "usualWorkPlaceName",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Nom ou descriptif du lieu habituel de travail",
    en: "Name or description of the usual work place"
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

export const groupedPersonUsualWorkPlaceGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "usualWorkPlace",
  datatype: "geojson",
  canBeCollapsed: true,
  autoCollapseWhenValid: true,
  containsHtml: true,
  label: {
    fr: "Positionnement du lieu habituel de travail",
    en: "Usual work place location"
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
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
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

export const groupedPersonUsualSchoolPlaceName = {
  type: "question",
  inputType: "string",
  path: "usualSchoolPlaceName",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: "Nom ou descriptif du votre lieu habituel d'études",
    en: "Name or description of the usual school place"
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

export const groupedPersonUsualSchoolPlaceGeography = {
  type: "question",
  inputType: "mapPoint",
  path: "usualSchoolPlace",
  datatype: "geojson",
  canBeCollapsed: true,
  autoCollapseWhenValid: true,
  containsHtml: true,
  label: {
    fr: "Positionnement du lieu habituel d'études",
    en: "Usual school place location"
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
    const occupation = surveyHelperNew.getResponse(interview, path, null, '../occupation');
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

export const groupedPersonNoWorkTripReason = {
  type: "question",
  path: "noWorkTripReason",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'leaveNoWork',
      internalId: 1,
      label: {
        fr: function(interview, path) {
          const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
          if (helper.isWorker(person.occupation))
          {
            return "Congé, ne travaillait pas";
          }
        },
        en: function(interview, path) {
          const person: any = surveyHelperNew.getResponse(interview, path, null, '../');
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
      //conditional: false,
      internalId: 8,
      label: {
        fr: "A effectué au moins un déplacement pour le travail",
        en: "Did make at least one work-related trip"
      }
    },
    {
      value: 'nonApplicable',
      //conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, motif non demandé",
        en: "Non applicable, reason not asked"
      }
    },
    {
      value: 'tripsUnknown',
      //conditional: false,
      internalId: 11,
      label: {
        fr: "Déplacements inconnus, motif non demandé",
        en: "Trips unknown, reason not asked"
      }
    },
    {
      value: 'usualWorkPlaceIsHome',
      //conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, lieu habituel de travail est le domicile",
        en: "Non applicable, usual work place is home"
      }
    }
  ],
  sameLine: false,
  label: {
    fr: "Raison aucun déplacement travail",
    en: "No work trip reason"
  },
  conditional: function(interview, path) {
    return true;
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

export const groupedPersonNoSchoolTripReason = {
  type: "question",
  path: "noSchoolTripReason",
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
      //conditional: false,
      internalId: 8,
      label: {
        fr: "A effectué au moins un déplacement pour les études",
        en: "Did make at least one school-related trip"
      }
    },
    {
      value: 'tripsUnknown',
      //conditional: false,
      internalId: 11,
      label: {
        fr: "Déplacements inconnus, motif non demandé",
        en: "Trips unknown, reason not asked"
      }
    },
    {
      value: 'nonApplicable',
      //conditional: false,
      internalId: 11,
      label: {
        fr: "Non applicable, motif non demandé",
        en: "Non applicable, reason not asked"
      }
    }
  ],
  sameLine: false,
  label: {
    fr: "Raison aucun déplacement études",
    en: "No school trip reason"
  },
  conditional: function(interview, path) {
    return true;
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

export const groupedPersonWhoAnsweredForThisPerson = {
  type: "question",
  path: "whoAnsweredForThisPerson",
  inputType: "radio",
  datatype: "string",
  twoColumns: true,
  choices: function(interview) {
    const persons: any = surveyHelperNew.getResponse(interview, "household.persons", {});
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
    return true;
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
