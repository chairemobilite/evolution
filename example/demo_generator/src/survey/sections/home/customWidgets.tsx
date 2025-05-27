import { TFunction } from 'i18next';
import config from 'chaire-lib-common/lib/config/shared/project.config';
// import i18n from 'chaire-lib-frontend/lib/config/i18n.config';
import * as validations from 'evolution-common/lib/services/widgets/validations/validations';
import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { defaultConditional } from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';
import * as inputTypes from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import * as conditionals from '../../common/conditionals';
import * as customHelpPopup from '../../common/customHelpPopup';
// import * as choices from '../../common/choices';
import * as customValidations from '../../common/customValidations';
import { defaultInvalidGeocodingResultTypes } from '../../common/customGeoData';

export const home_geography: inputTypes.InputMapFindPlaceType = {
    ...defaultInputBase.inputMapFindPlaceBase,
    path: 'home.geography',
    label: (t: TFunction, _interview, _path) => {
        return t('home:home.geography');
    },
    icon: {
        url: '/dist/images/activities_icons/home_marker.svg',
        size: [70, 70]
    },
    geocodingQueryString: (interview) => {
        // TODO: Add country and region to the geocoding query string
        const city = surveyHelperNew.getResponse(interview, 'home.city', null);
        const address = surveyHelperNew.getResponse(interview, 'home.address', null);
        const postalCode = surveyHelperNew.getResponse(interview, 'home.postalCode', null);

        // Fields to use for geocoding
        const fieldsAddress = [];
        // Postal code is optional
        if (postalCode !== null) {
            fieldsAddress.push(postalCode);
        }
        fieldsAddress.push(city, address);

        return [{ queryString: surveyHelperNew.formatGeocodingQueryStringFromMultipleFields(fieldsAddress), zoom: 16 }];
    },
    defaultCenter: config.mapDefaultCenter,
    defaultZoom: config.mapDefaultZoom,
    invalidGeocodingResultTypes: defaultInvalidGeocodingResultTypes,
    validations: (value, _customValue, interview, path) =>
        customValidations.getGeographyCustomValidation({
            value,
            interview,
            path
        })
    // conditional: conditionals.homeGeographyConditional
};
