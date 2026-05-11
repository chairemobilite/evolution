/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TextWidgetConfig, VisitedPlacesSectionConfiguration } from '../../types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { UserInterviewAttributes } from '../../types';
import { WidgetFactoryOptions } from '../types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const getPersonVisitedPlacesTitleWidgetConfig = (
    _sectionConfig: VisitedPlacesSectionConfiguration,
    options: WidgetFactoryOptions
): TextWidgetConfig => {
    return {
        type: 'text',
        align: 'left',
        containsHtml: true,
        text: (t: TFunction, interview: UserInterviewAttributes) => {
            // Get the active person and journey from interview data, there is no path necessary for text widgets
            const person = odHelpers.getPerson({ interview }) as any;
            if (!person) {
                throw new Error('Active person not found in interview response');
            }
            const journey = odHelpers.getActiveJourney({ interview, person });
            if (!journey) {
                throw new Error('Active journey for person not found in interview response');
            }

            // Format the journey start date for context in the title
            // FIXME Update to support multiple days journeys when we support them in builtin questionnaire
            const assignedDay = journey.startDate;
            const journeyDate = !_isBlank(assignedDay)
                ? options.getFormattedDate(assignedDay!, { withDayOfWeek: true, withRelative: true })
                : undefined;

            return t('visitedPlaces:personVisitedPlacesTitle', {
                nickname: odHelpers.getPersonIdentificationString({ person, t }),
                context: odHelpers.getPersonGenderContext({ person }),
                journeyDate,
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        }
    };
};
