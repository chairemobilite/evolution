/*
 * Copyright 2023, Polytechnique Montreal and contributors
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
import getAdminSurveyRoutes from '../../components/admin/routers/AdminSurveyRouter';
import { configureStore } from '../../store/configureStore';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { InterviewContext, interviewReducer, initialState } from '../../contexts/InterviewContext';
import { SurveyContext, surveyReducer } from '../../contexts/SurveyContext';
import appConfig, { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import '../../styles/survey/styles-admin-survey.scss';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';
import SegmentsSection from '../../components/survey/sectionTemplates/TripsAndSegmentsSection';
import { UserPermissions } from 'chaire-lib-common/lib/services/user/userType';

// TODO This is a workaround to get the links to the user, until some more complete solution is implemented (see https://github.com/chairemobilite/transition/issues/1516)
const pages: { path: string; permissions: UserPermissions; title: string }[] = [
    { path: '/admin/validation', permissions: { Interviews: ['validate'] }, title: 'admin:validationPageTitle' },
    { path: '/admin/monitoring', permissions: { Interviews: ['manage'] }, title: 'admin:monitoringPageTitle' },
    { path: '/admin/users', permissions: { Users: ['read', 'update'] }, title: 'admin:usersPageTitle' }
];
setApplicationConfiguration({
    homePage: '/home',
    pages,
    templateMapping: { tripsAndSegmentsWithMap: SegmentsSection }
});

export default () => {
    document.title = config.title[i18n.language];

    const store = configureStore();
    const Jsx = () => {
        const [state, dispatch] = React.useReducer(interviewReducer, initialState);
        const [devMode, dispatchSurvey] = React.useReducer(surveyReducer, { devMode: false });
        const router = React.useMemo(() => createBrowserRouter(getAdminSurveyRoutes()), []);

        return (
            <SurveyContext.Provider
                value={{
                    sections: appConfig.sections,
                    widgets: appConfig.widgets,
                    ...devMode,
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
