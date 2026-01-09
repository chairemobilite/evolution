/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { createBrowserRouter, RouterProvider } from 'react-router';

import config from 'evolution-common/lib/config/project.config';
import i18n from '../../config/i18n.config';
import getParticipantSurveyRoutes from '../../components/routers/ParticipantSurveyRouter';
import { configureStore } from '../../store/configureStore';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { InterviewContext, interviewReducer, initialState } from '../../contexts/InterviewContext';
// TODO When the project is the root of the application (instead of evolution directly importing project files), this should go in the project
import { SurveyContext, surveyReducer } from '../../contexts/SurveyContext';
import appConfig, { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import '../../styles/survey/styles-participant-survey.scss';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';
import SegmentsSection from '../../components/survey/sectionTemplates/TripsAndSegmentsSection';

setApplicationConfiguration({ homePage: '/survey', templateMapping: { tripsAndSegmentsWithMap: SegmentsSection } });

type AppSettings = {
    // Additional app context, that can be used as context in basic translations strings
    appContext?: string;
};

const App = (settings?: AppSettings) => {
    document.title = config.title[i18n.language];

    const store = configureStore();
    const Jsx: React.FC = () => {
        const [state, dispatch] = React.useReducer(interviewReducer, initialState);
        const [devMode, dispatchSurvey] = React.useReducer(surveyReducer, { devMode: false });
        const router = React.useMemo(() => createBrowserRouter(getParticipantSurveyRoutes()), []);

        return (
            <SurveyContext.Provider
                value={{
                    sections: appConfig.sections,
                    widgets: appConfig.widgets,
                    ...devMode,
                    appContext: settings?.appContext,
                    dispatch: dispatchSurvey
                }}
            >
                <InterviewContext.Provider value={{ state, dispatch }}>
                    <Provider store={store}>
                        <I18nextProvider i18n={i18n}>
                            <RouterProvider router={router} />
                        </I18nextProvider>
                    </Provider>
                </InterviewContext.Provider>
            </SurveyContext.Provider>
        );
    };

    let hasRendered = false;
    const root = createRoot(document.getElementById('app') as HTMLElement);

    const renderApp = () => {
        if (!hasRendered) {
            root.render(<Jsx />);
            hasRendered = true;
        }
    };

    root.render(<LoadingPage />);

    verifyAuthentication(store.dispatch).finally(() => renderApp());
};

export default App;
