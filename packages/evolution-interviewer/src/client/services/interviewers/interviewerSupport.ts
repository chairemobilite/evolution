/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';

import Preferences from 'chaire-lib-common/lib/config/Preferences';
import { ApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';

const interviewerModeMenuItem = {
    getText: (t: TFunction) =>
        Preferences.get('interviewMode', 'participant') === 'interviewer'
            ? t('survey:ParticipantMode')
            : t('survey:InterviewerMode'),
    action: () => {
        const currentMode = Preferences.get('interviewMode', 'participant');
        const newMode = currentMode === 'participant' ? 'interviewer' : 'participant';
        Preferences.update({ interviewMode: newMode });
    }
};

const addInterviewerOptions = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    config: ApplicationConfiguration<
        EvolutionApplicationConfiguration<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    >
) => {
    const menuItems = config.userMenuItems || [];
    menuItems.push(interviewerModeMenuItem);
    config.userMenuItems = menuItems;
    // TODO Add specific monitoring for interviewers
};

export default addInterviewerOptions;
