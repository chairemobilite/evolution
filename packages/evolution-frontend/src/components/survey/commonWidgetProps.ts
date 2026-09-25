/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import type {
    InterviewUpdateCallbacks,
    UserInterviewAttributes,
    WidgetStatus
} from 'evolution-common/lib/services/questionnaire/types';

/**
 * Props shared by every widget type.
 */
export type CommonWidgetProps = Partial<InterviewUpdateCallbacks> & {
    /** Shortname of the section that contains the widget. */
    section: string;
    /** Widget shortname, the key of this widget in the questionnaire. */
    shortname: string;
    path: string;
    customPath?: string;
    loadingState?: number;
    /** Set when the widget is rendered inside a grouped object. */
    groupedObjectId?: string;
    widgetStatus: WidgetStatus;
    interview: UserInterviewAttributes;
    user?: CliUser;
};
