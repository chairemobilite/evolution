/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                    from 'react';
import ReactDOM                 from 'react-dom';
import { Provider }             from 'react-redux';
import { I18nextProvider }      from 'react-i18next';
import { createBrowserHistory } from 'history';
import { Router }               from 'react-router-dom';

import config from 'evolution-common/lib/config/project.config';
import i18n              from 'evolution-frontend/lib/config/i18n.config';
import SurveyRouter      from 'evolution-frontend/lib/components/routers/ParticipantSurveyRouter';
import configureStore    from 'evolution-frontend/lib/store/configureStore';
import LoadingPage       from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { InterviewContext, interviewReducer, initialState } from 'evolution-frontend/lib/contexts/InterviewContext';
// TODO When the project is the root of the application (instead of evolution directly importing project files), this should go in the project
import { SurveyContext, surveyReducer } from 'evolution-frontend/lib/contexts/SurveyContext';
import appConfig, { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import '../../../styles/survey/styles-participant-survey.scss';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';
import SegmentsSection from 'evolution-frontend/lib/components/survey/sectionTemplates/TripsAndSegmentsSection';

setApplicationConfiguration({ homePage: '/survey', templateMapping: { 'tripsAndSegmentsWithMap': SegmentsSection } });

/*
type AppProps = {
  // Additional app context, that can be used as context in basic translations strings
  appContext: string;
};
 */

// Type of props AppProps
export default (props = {}) => {
    document.title = config.title[i18n.language];

    const history = createBrowserHistory();
    
    const store = configureStore();
    const Jsx = () => {
      const [state, dispatch] = React.useReducer(interviewReducer, initialState);
      const [devMode, dispatchSurvey] = React.useReducer(surveyReducer, { devMode: false });
      return(
        <SurveyContext.Provider value={{ sections: appConfig.sections, widgets: appConfig.widgets, ...devMode, appContext: props.appContext, dispatch: dispatchSurvey }}>
        <InterviewContext.Provider value={{ state, dispatch }}>
          <Provider store={store}>
            <I18nextProvider i18n={ i18n }>
              <Router history={history}>
                <SurveyRouter/>
              </Router>
            </I18nextProvider>
          </Provider>
        </InterviewContext.Provider>
        </SurveyContext.Provider>
      )
    };
    let hasRendered = false;
    const renderApp = () => {
      if (!hasRendered) {
        ReactDOM.render(<Jsx/>, document.getElementById('app'));
        hasRendered = true;
      }
    };
    
    ReactDOM.render(<LoadingPage />, document.getElementById('app'));
    
    verifyAuthentication(store.dispatch).finally(() => renderApp());
}
