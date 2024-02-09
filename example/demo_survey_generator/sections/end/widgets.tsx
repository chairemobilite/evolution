import { TFunction } from 'i18next';
import * as defaultInputBase from 'generator/lib/common/defaultInputBase';
import { defaultConditional } from 'generator/lib/common/defaultConditional';
// import * as choices from '../../common/choices';
// import * as conditionals from '../../common/conditionals';
// import * as customWidgets from '../../common/customWidgets';
// import * as helpPopup from '../../common/helpPopup';
import * as inputTypes from 'generator/lib/types/inputTypes';
// import * as inputRange from '../../common/inputRange';
import * as validations from 'generator/lib/common/validations';

export const end_thankYouMessage: inputTypes.InputText = {
    ...defaultInputBase.inputTextBase,
    path: 'end.thankYouMessage',
    text: (t: TFunction) => `<p class="input-text">${t('end:end.thankYouMessage')}</p>`,
    conditional: defaultConditional
};

export const end_nextButton: inputTypes.InputButton = {
    ...defaultInputBase.buttonNextBase,
    path: 'end.nextButton',
    label: (t: TFunction) => t('end:end.nextButton')
};
