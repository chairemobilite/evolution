/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import moment from 'moment';


export const householdResidentialPhoneType = {
  type: "question",
  path: "household.residentialPhoneType",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  choices: [
    {
      value: 'landLine',
      label: {
        fr: "Téléphone fixe régulier",
        en: "Regular landline"
      }
    },
    {
      value: 'ip',
      label: {
        fr: "Téléphone IP / Internet",
        en: "IP / Internet Phone"
      }
    },
    {
      value: 'cellphone',
      label: {
        fr: "Téléphone cellulaire partagé par le ménage",
        en: "Cellphone shared by the household"
      }
    },
    {
      value: 'none',
      label: {
        fr: "Aucun téléphone résidentiel",
        en: "No residential phone"
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
  containsHtml: true,
  label: {
    fr: function(interview, path) {
      return `De quel type est votre téléphone résidentiel?<br />
      <span class="_oblique _pale">Si certains ou tous les membres du ménage ont un téléphone cellulaire mais qu'aucun n'est partagé entre eux et que vous n'avez pas une ligne dédiée au domicile, choisir "Aucun téléphone résidentiel"</span>`;
    },
    en: function(interview, path) {
      return `Of what type is your residential phone?<br />
      <span class="_oblique _pale">If some or all members of your household own a cellphone, but none are shared and there is no phone line dedicated to your home, choose "No residential phone"</span>`;
    }
  },
  helpPopup: {
    title: {
      fr: "Pourquoi cette question?",
      en: "Why this question?"
    },
    content: {
      fr: function(interview, path) {
        return `Le type de téléphone résidentiel nous permet de vérifier si vous auriez pu être appelé par téléphone pour participer à l'enquête. Cela permet également d'obtenir le pourcentage des ménages de la région qui possèdent chaque type de ligne téléphonique.`;
      },
      en: function(interview, path) {
        return `The type of residential phone allows us to verify if you could have been called to participate in the telephone survey. This also provides percentages of households in the region that own each type of residential phone.`;
      }
    }
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: (_isBlank(value)),
        errorMessage: {
          fr: `Le type de téléphone résidentiel est requis.`,
          en: `Residential phone type is required.`
        }
      }
    ];
  }

};

export const householdWouldLikeToParticipateInOtherSurveys = {
  type: "question",
  path: "household.wouldLikeToParticipateInOtherSurveys",
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
      return `Seriez-vous intéressés à participer à d'autres études sur la mobilité menées par des partenaires de l'enquête (Chaire Mobilité de Polytechnique Montréal, ARTM, STM, RTL, STL, EXO, Ville de Montréal et ministère des Transports)?`;
    },
    en: function(interview, path) {
      return `Would you be interested to participate to other travel surveys conducted by this survey's partners  (Chaire Mobilité from Polytechnique Montreal, ARTM, STM, RTL, STL, EXO, City of Montreal and ministère des Transports)?`;
    }
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: (_isBlank(value)),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required.`
        }
      }
    ];
  }

};

export const householdDidAlsoRespondByPhone = {
  type: "question",
  path: "household.didAlsoRespondByPhone",
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
      return `Est-ce que vous ou un autre membre de votre ménage avez également répondu à cette enquête de l'ARTM cette année lors d'une entrevue téléphonique ou web?`;
    },
    en: function(interview, path) {
      return `Did you or another member of your household responded to this ARTM survey this year in a phone or web interview?`;
    }
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: (_isBlank(value)),
        errorMessage: {
          fr: `Cette réponse est requise.`,
          en: `This field is required`
        }
      }
    ];
  }

};

export const householdContactEmail = {
  type: "question",
  path: "household.contactEmail",
  inputType: "string",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: function(interview, path) {
      return `Veuillez fournir une adresse courriel de contact pour participer à d'autres études sur la mobilité`;
    },
    en: function(interview, path) {
      return `Please provide an email address to participate to other travel surveys`;
    }
  },
  conditional: function(interview, path) {
    return [surveyHelperNew.getResponse(interview, path, null, "../wouldLikeToParticipateInOtherSurveys") === true, null];
  },
  validations: function(value, customValue, interview, path, customPath) {
    return [
      {
        validation: (!_isBlank(value) && !(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(value)),
        errorMessage: {
          fr: "Le courriel est invalide.",
          en: "Email is invalid"
        }
      }
    ];
  }
};

export const householdDateNextContact = {
    type: "question",
    path: "household.dateNextContact",
    inputType: "datePicker",
    datatype: "number",
    twoColumns: true,
    showTimeSelect: false,
    placeholderText: { fr: 'Cliquer pour sélectionner la date', en: 'Click to select date' },
    maxDate: (interview, path) => {
        const startDate = interview.response._startedAt ? moment.unix(interview.response._startedAt) : moment();
        return startDate.add(2, 'months').toDate()
    },
    minDate:(interview, path) => {
        const startDate = interview.response._startedAt ? moment.unix(interview.response._startedAt) : moment();
        return startDate.add(2, 'weeks').toDate()
    },
    locale: { fr: 'fr', en: 'en-CA' },
    label: {
      fr: function(interview, path) {
        return `Quand voulez-vous qu'on vous recontacte à propos de cette enquête?`;
      },
      en: function(interview, path) {
        return `When do you want to be contacted again for this survey?`;
      }
    },
    conditional: function(interview, path) {
        return [surveyHelperNew.getResponse(interview, path, null, "../wouldLikeToParticipateInOtherSurveys") === true, null];
    },
};


export const householdIncome = {
  type: "question",
  path: "household.income",
  inputType: "select",
  datatype: "string",
  twoColumns: true,
  label: {
    fr: function(interview, path) {
      return `Quelle était la tranche de revenu de votre ménage avant impôt (brut), en 2017? (facultatif)`;
    },
    en: function(interview, path) {
      return `What was your household income range before taxes (gross income), in 2017? (facultative)`;
    }
  },
  choices: [
    {
      value: "000000_029999",
      internalId: 1,
      label: {
        fr: "Moins de 30 000 $",
        en: "Less than $30,000"
      }
    },
    {
      value: "030000_059999",
      internalId: 2,
      label: {
        fr: "30 000 à 59 999 $",
        en: "$30,000 - $59,999"
      }
    },
    {
      value: "060000_089999",
      internalId: 3,
      label: {
        fr: "60 000 à 89 999 $",
        en: "$60,000 - $89,999"
      }
    },
    {
      value: "090000_119999",
      internalId: 4,
      label: {
        fr: "90 000 à 119 999 $",
        en: "$90,000 - $119,999"
      }
    },
    {
      value: "120000_149999",
      internalId: 5,
      label: {
        fr: "120 000 à 149 999 $",
        en: "$120,000 - $149,999"
      }
    },
    {
      value: "150000_179999",
      internalId: 6,
      label: {
        fr: "150 000 à 179 999 $",
        en: "$150,000 - $179,999"
      }
    },
    {
      value: "180000_209999",
      internalId: 7,
      label: {
        fr: "180 000 à 209 999 $",
        en: "$180,000 - $209,999"
      }
    },
    {
      value: "210000_999999",
      internalId: 8,
      label: {
        fr: "210 000 $ et plus",
        en: "$210,000 and more"
      }
    },
    {
      value: "dontKnow",
      internalId: 10,
      label: {
        fr: "Je ne sais pas",
        en: "I don't know"
      }
    },
    {
      value: "refusal",
      internalId: 9,
      label: {
        fr: "Je préfère ne pas répondre",
        en: "I prefer not to respond"
      }
    }
  ]
};

export const householdSurveyAppreciation = {
    type: "question",
    path: "household.surveyAppreciation",
    inputType: "slider",
    includeNotApplicable: true,
    datatype: "number",
    twoColumns: true,
    maxValue: 10,
    minValue: 0,
    labels: [
        { fr: 'Un peu', en: 'Not much'},
        { fr: 'Beaucoup', en: 'A lot' }
    ],
    label: {
      fr: function(interview, path) {
        return `Comment avez-vous apprécié ce questionnaire?`;
      },
      en: function(interview, path) {
        return `How did you like this survey?`;
      }
    },
};

export const householdCommentsOnSurvey = {
  type: "question",
  path: "household.commentsOnSurvey",
  inputType: "text",
  datatype: "text",
  twoColumns: false,
  label: {
    fr: function(interview, path) {
      return `Vos commentaires et suggestions sur le questionnaire`;
    },
    en: function(interview, path) {
      return `Your comments and suggestions about the questionnaire`;
    }
  }

};

export const completedText = {
  type: "text",
  align: 'center',
  containsHtml: true,
  text: {
    fr: function(interview) {
      return `<div class="center"><p class="_green _large _strong">L'entrevue est maintenant terminée. Merci pour votre participation et votre patience!</p>
      <p class="_oblique _bold _blue">Vous pouvez modifier vos réponses en cliquant sur les sections complétées dans le menu ci-dessus.</p></div>
      <div class="center"><img src="${config.logoPaths['fr']}" style="height: 15rem;" alt="Logo" /></div>`;
    },
    en: function(interview) {
      return `<div class="center"><p class="_green _large _strong">The interview is now completed. Thank you very much for your participation and your patience!</p>
      <p class="_oblique _bold _blue">You can modify your answers by clicking on any of the completed sections in the sections menu on top.</p></div>
      <div class="center"><img src="${config.logoPaths['en']}"style="height: 15rem;" alt="Logo" /></div>`
    }
  }
};