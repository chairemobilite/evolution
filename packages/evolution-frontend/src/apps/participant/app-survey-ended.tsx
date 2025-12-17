/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import config from 'evolution-common/lib/config/project.config';
import i18n from '../../config/i18n.config';
import SurveyEndedPage from '../../components/pages/SurveyEndedPage';
import '../../styles/survey/styles-participant-survey.scss';

const runSurveyEndedApp = () => {
    document.title = config.title[i18n.language];

    const Jsx: React.FC = () => {
        return (
            <I18nextProvider i18n={i18n}>
                <SurveyEndedPage />
            </I18nextProvider>
        );
    };

    const container = document.getElementById('app');
    if (container) {
        const root = createRoot(container);
        root.render(<Jsx />);
    }
};

runSurveyEndedApp();
