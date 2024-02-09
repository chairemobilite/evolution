import { TFunction } from 'i18next';
import * as defaultInputBase from 'generator/lib/common/defaultInputBase';
import { defaultConditional } from 'generator/lib/common/defaultConditional';
import * as choices from '../../common/choices';
import * as conditionals from '../../common/conditionals';
import * as customWidgets from '../../common/customWidgets';
// import * as helpPopup from '../../common/helpPopup';
import * as inputTypes from 'generator/lib/types/inputTypes';
import * as inputRange from '../../common/inputRange';
import * as validations from 'generator/lib/common/validations';

export const home_welcomeMessage: inputTypes.InputText = {
    ...defaultInputBase.inputTextBase,
    path: 'home.welcomeMessage',
    text: (t: TFunction) => `<p class="input-text">${t('home:home.welcomeMessage')}</p>`,
    conditional: defaultConditional
};

export const home_email: inputTypes.InputString = {
    ...defaultInputBase.inputStringBase,
    path: 'home.email',
    label: (t: TFunction) => t('home:home.email'),
    conditional: defaultConditional,
    validations: validations.emailValidation
};

export const home_postalCode = customWidgets.home_postalCode;

export const home_doYouHaveChild: inputTypes.InputRadio = {
    ...defaultInputBase.inputRadioBase,
    path: 'home.doYouHaveChild',
    label: (t: TFunction) => t('home:home.doYouHaveChild'),
    choices: choices.yesNoChoices,
    conditional: defaultConditional,
    validations: validations.requiredValidation
};

export const home_ageYoungestChild: inputTypes.InputString = {
    ...defaultInputBase.inputNumberBase,
    path: 'home.ageYoungestChild',
    label: (t: TFunction) => t('home:home.ageYoungestChild'),
    conditional: conditionals.ifRadioYesConditional,
    validations: validations.ageValidation
};

export const home_transportModesUse: inputTypes.InputCheckbox = {
    ...defaultInputBase.inputCheckboxBase,
    path: 'home.transportModesUse',
    label: (t: TFunction) => t('home:home.transportModesUse'),
    choices: choices.transportModesChoices,
    conditional: defaultConditional,
    validations: validations.requiredValidation
};

export const home_goodAnswers: inputTypes.InputRange = {
    ...defaultInputBase.inputRangeBase,
    ...inputRange.confidentInputRange,
    path: 'home.goodAnswers',
    label: (t: TFunction) => t('home:home.goodAnswers'),
    conditional: defaultConditional,
    validations: validations.inputRangeValidation
};

export const home_comments: inputTypes.TextArea = {
    ...defaultInputBase.textAreaBase,
    path: 'home.comments',
    label: (t: TFunction) => t('home:home.comments'),
    conditional: defaultConditional,
    validations: validations.optionalValidation
};

export const home_saveAndContinue: inputTypes.InputButton = {
    ...defaultInputBase.buttonNextBase,
    path: 'home.saveAndContinue',
    label: (t: TFunction) => t('home:home.saveAndContinue')
};
