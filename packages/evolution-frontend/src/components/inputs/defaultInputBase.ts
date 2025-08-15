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
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import {
    ButtonWidgetConfig,
    InputCheckboxType,
    InputMapFindPlaceType,
    InputRadioNumberType,
    InputRadioType,
    InputRangeType,
    InputSelectType,
    InputStringType,
    InputTextType,
    InputTimeType,
    TextWidgetConfig
} from 'evolution-common/lib/services/questionnaire/types';
import { validateButtonActionWithCompleteSection } from '../../services/display/frontendHelper';

// TODO: Make sure to add tests for these default inputs

// Input Radio default params
export const inputRadioBase: Pick<InputRadioType, 'type' | 'inputType' | 'datatype' | 'columns'> = {
    type: 'question',
    inputType: 'radio',
    datatype: 'string',
    columns: 1
};

// Input Radio Number default params
export const inputRadioNumberBase: Pick<InputRadioNumberType, 'type' | 'inputType' | 'columns' | 'sameLine'> = {
    type: 'question',
    inputType: 'radioNumber',
    columns: 1,
    sameLine: true
};

// Input String default params
export const inputStringBase: Pick<InputStringType, 'type' | 'inputType' | 'datatype'> = {
    type: 'question',
    inputType: 'string',
    datatype: 'string'
};

// Input Number default params
export const inputNumberBase: Pick<
    InputStringType,
    'type' | 'inputType' | 'datatype' | 'size' | 'inputFilter' | 'keyboardInputMode'
> = {
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
export const infoTextBase: Pick<TextWidgetConfig, 'type'> = {
    type: 'text'
};

// InputRange default params
export const inputRangeBase: Pick<InputRangeType, 'type' | 'inputType'> = {
    type: 'question',
    inputType: 'slider'
};

// Checkbox default params
export const inputCheckboxBase: Pick<InputCheckboxType, 'type' | 'inputType' | 'datatype' | 'columns'> = {
    type: 'question',
    inputType: 'checkbox',
    datatype: 'string',
    columns: 1
};

// Select default params
export const inputSelectBase: Pick<InputSelectType, 'type' | 'inputType' | 'datatype'> = {
    type: 'question',
    inputType: 'select',
    datatype: 'string'
};

// InputTime default params
export const inputTimeBase: Pick<InputTimeType, 'type' | 'inputType' | 'datatype'> = {
    type: 'question',
    inputType: 'time',
    datatype: 'integer'
};

// Next button default params
export const buttonNextBase: Pick<
    ButtonWidgetConfig,
    'type' | 'color' | 'hideWhenRefreshing' | 'icon' | 'align' | 'action'
> = {
    type: 'button',
    color: 'green',
    hideWhenRefreshing: true,
    // FIXME: Fix import icon
    icon: faCheckCircle,
    align: 'center',
    action: validateButtonActionWithCompleteSection
};

// Text textarea default params
export const textBase: Pick<InputTextType, 'type' | 'inputType' | 'datatype'> = {
    type: 'question',
    inputType: 'text',
    datatype: 'text'
};

// Find map place default params
export const inputMapFindPlaceBase: Pick<
    InputMapFindPlaceType,
    | 'type'
    | 'inputType'
    | 'height'
    | 'containsHtml'
    | 'autoConfirmIfSingleResult'
    | 'placesIcon'
    | 'defaultCenter'
    | 'refreshGeocodingLabel'
    | 'showSearchPlaceButton'
    | 'afterRefreshButtonText'
    | 'validations'
> = {
    type: 'question',
    inputType: 'mapFindPlace',
    height: '32rem',
    containsHtml: true,
    autoConfirmIfSingleResult: true,
    placesIcon: {
        url: () => '/dist/images/activities_icons/default_marker.svg',
        size: [70, 70]
    },
    defaultCenter: config.mapDefaultCenter,
    refreshGeocodingLabel: (t: TFunction) => t('customLabel:RefreshGeocodingLabel'),
    showSearchPlaceButton: () => true,
    afterRefreshButtonText: (t: TFunction) => t('customLabel:GeographyAfterRefresh'),
    validations: (value, _customValue, interview, path) => {
        const geography: any = surveyHelper.getResponse(interview, path as string, null);
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
