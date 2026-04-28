/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TextWidgetConfig } from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { UserInterviewAttributes } from '../../types';
import { WidgetFactoryOptions } from '../types';

export const getPersonsTripsTitleWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    // FIXME: Add a common type for the getFormattedDate function if we keep it as option here (the actual implementation is frontend-only as it requires i18n locale)
    options: WidgetFactoryOptions
): TextWidgetConfig => {
    const getContext = options.context || ((str) => str);
    return {
        type: 'text',
        align: 'left',
        text: (t: TFunction, interview: UserInterviewAttributes) => {
            const person = odHelpers.getActivePerson({ interview });
            const journey = odHelpers.getActiveJourney({ interview });
            if (!person || !journey) {
                throw new Error('personTripsTitle: Person or Journey not found');
            }
            // FIXME Write a function somewhere to get the journey's or dateToString function, once we move to objects
            // FIXME2 Plan for a translation string that has a period (undated, dated, period)
            const journeyDates = journey.startDate ? options.getFormattedDate(journey.startDate) : null;
            return t(['customSurvey:segments:Description', 'segments:Description'], {
                context: getContext(journeyDates === null ? 'undated' : undefined),
                nickname: person.nickname ? person.nickname : '',
                journeyDates,
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        }
    };
};
