/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export const homeIntro = {
  type: "text",
  text: {
    fr: "Nous allons vous demander de compléter les informations suivantes concernant votre ménage et votre domicile:",
    en: "We will ask you to provide information about your household and your home:"
  }
};

export const householdCarNumber = {
  type: "question",
  path: 'household.carNumber',
  twoColumns: true,
  inputType: "string",
  datatype: "integer",
  label: {
    fr: "Combien de véhicules sont utilisés par les membres de votre ménage sur une base régulière?",
    en: "How many vehicles are used by members of your household?"
  }
};

export const buttonSelectPersonConfirm = {
  type: "button",
  color: "green",
  label: {
    fr: "Sélectionner cette personne et continuer",
    en: "Select this person and continue"
  },
  align: 'center',
  action: function (section, sections, saveCallback) {
    // FIXME: The questionsValidity is undefined
    // const _questionsValidity = questionsValidity();
    const _questionsValidity = [];
    let isValid = true;
    for (let questionPath in _questionsValidity)
    {
      if (_questionsValidity[questionPath] === false)
      {
        isValid = false;
      }
    }
    if (isValid)
    {
      window.scrollTo(0, 0);
      this.props.startUpdateInterview('selectPerson',{
        'responses.activeSection': sections[section].nextSection
      });
    }
    else {
      
    }
  }
};

export const buttonSaveNextSection = {
  type: "button",
  color: "green",
  label: {
    fr: "Sauvegarder et continuer",
    en: "Save and continue"
  },
  align: 'center',
  action: function (section, sections, interview, startUpdateInterview, questionsValidity) {
    const _questionsValidity = questionsValidity();
    let isValid = true;
    for (let questionPath in _questionsValidity)
    {
      if (_questionsValidity[questionPath] === false)
      {
        isValid = false;
      }
    }
    if (isValid)
    {
      window.scrollTo(0, 0);
      startUpdateInterview(null, {
        'responses.activeSection': sections[section].nextSection
      });
    }
    else {
      console.log('at least one question is invalid');
    }
    
  }
};
