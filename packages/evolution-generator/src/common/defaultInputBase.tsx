/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import * as inputTypes from '../types/inputTypes';

// TODO: Make sure to add tests for these default inputs

// Input Radio default params
export const inputRadioBase: inputTypes.InputRadioBase = {
    type: 'question',
    inputType: 'radio',
    datatype: 'string',
    columns: 1
};

// Input Radio Number default params
export const inputRadioNumberBase: inputTypes.InputRadioNumberBase = {
    type: 'question',
    inputType: 'radioNumber',
    datatype: 'integer',
    columns: 1,
    sameLine: true
};

// Input String default params
export const inputStringBase: inputTypes.InputStringBase = {
    type: 'question',
    inputType: 'string',
    datatype: 'string'
};

// Input Number default params
export const inputNumberBase: inputTypes.InputStringBase = {
    type: 'question',
    inputType: 'string',
    datatype: 'integer',
    size: 'small',
    inputFilter: (value) => {
        // Remove all non-numeric characters
        return value.replace(/[^0-9]/g, '');
    },
    keyboardInputMode: 'numeric'
};

// InfoText default params
export const infoTextBase: inputTypes.InfoTextBase = {
    type: 'text'
};

// InputRange default params
export const inputRangeBase: inputTypes.InputRangeBase = {
    type: 'question',
    inputType: 'slider',
    initValue: null
};

// Checkbox default params
export const inputCheckboxBase: inputTypes.InputCheckboxBase = {
    type: 'question',
    inputType: 'checkbox',
    datatype: 'string',
    multiple: true,
    columns: 1
};

// Select default params
export const inputSelectBase: inputTypes.InputSelectBase = {
    type: 'question',
    inputType: 'select',
    datatype: 'string',
    hasGroups: true
};

// Next button default params
export const buttonNextBase: inputTypes.InputButtonBase = {
    type: 'button',
    color: 'green',
    hideWhenRefreshing: true,
    // FIXME: Fix import icon
    icon: faCheckCircle,
    align: 'center',
    action: surveyHelper.validateButtonActionWithCompleteSection
};

// Text textarea default params
export const textBase: inputTypes.TextBase = {
    type: 'question',
    inputType: 'text',
    datatype: 'text'
};

// Find map place default params
export const inputMapFindPlaceBase: inputTypes.InputMapFindPlaceBase = {
    type: 'question',
    inputType: 'mapFindPlace',
    datatype: 'geojson',
    height: '32rem',
    containsHtml: true,
    autoConfirmIfSingleResult: true,
    placesIcon: {
        url: () => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
    },
    defaultCenter: config.mapDefaultCenter,
    refreshGeocodingLabel: (t: TFunction) => t('customLibelle:RefreshGeocodingLabel'),
    showSearchPlaceButton: () => true,
    afterRefreshButtonText: (t: TFunction) => t('customLibelle:GeographyAfterRefresh'),
    validations: (value, _customValue, interview, path) => {
        const geography: any = surveyHelperNew.getResponse(interview, path as string, null);
        return [
            {
                validation: _isBlank(value),
                errorMessage: {
                    fr: 'Le positionnement du lieu est requis.',
                    en: 'Positioning of the place is required.'
                }
            },
            {
                validation:
                    geography &&
                    geography.properties.lastAction &&
                    geography.properties.lastAction === 'mapClicked' &&
                    geography.properties.zoom < 14,
                errorMessage: {
                    fr: 'Le positionnement du lieu n\'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l\'icône.',
                    en: 'The positioning of the place is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.'
                }
            }
        ];
    }
};
