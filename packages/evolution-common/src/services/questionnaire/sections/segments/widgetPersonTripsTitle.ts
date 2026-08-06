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

export const getPersonsTripsTitleWidgetConfig = (options: WidgetFactoryOptions): TextWidgetConfig => {
    return {
        type: 'text',
        align: 'left',
        text: (t: TFunction, interview: UserInterviewAttributes) => {
            const person = odHelpers.getActivePerson({ interview });
            const journey = odHelpers.getActiveJourney({ interview });
            if (!person || !journey) {
                throw new Error('personTripsTitle: Person or Journey not found');
            }
            // Format journey dates with relative and day of week, for the title
            const journeyDates = odHelpers.formatJourneyDates({
                journey: journey,
                getFormattedDate: options.getFormattedDate,
                withDayOfWeek: true,
                withRelative: true
            });
            return t(journeyDates === null ? 'segments:personTripsTitle_undated' : 'segments:personTripsTitle', {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname: person.nickname ? person.nickname : '',
                journeyDates,
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        }
    };
};
