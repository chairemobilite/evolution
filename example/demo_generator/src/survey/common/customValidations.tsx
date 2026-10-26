import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';

// Return the validations for the geography
export const getGeographyCustomValidation = ({ value, interview, path }) => {
    const geography: any = surveyHelperNew.getResponse(interview, path, null);
    const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;

    return [
        {
            validation: _isBlank(value),
            errorMessage: { text: 'visitedPlaces:locationIsRequiredError' }
        },
        {
            validation:
                geography &&
                geography.properties.lastAction &&
                (geography.properties.lastAction === 'mapClicked' ||
                    geography.properties.lastAction === 'markerDragged') &&
                geography.properties.zoom < 15,
            errorMessage: { text: 'visitedPlaces:locationIsNotPreciseError' }
        },
        {
            validation: geography && geography.properties.isGeocodingImprecise,
            errorMessage: {
                text: 'survey:geography.geocodingStringImpreciseError',
                params: { geocodingTextInput: geocodingTextInput || '' }
            }
        }
    ];
};
