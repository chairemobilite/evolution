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

import config from 'chaire-lib-frontend/lib/config/project.config';
import i18n              from '../../../config/survey/i18n.config';
import SurveyRouter      from './SurveyRouter';
import configureStore    from '../../../store/survey/configureStore';
import { login, logout } from '../../../actions/shared/auth';
import LoadingPage       from '../../../components/shared/LoadingPage';
import { InterviewContext, interviewReducer, initialState } from 'evolution-frontend/lib/contexts/InterviewContext';
// TODO When the project is the root of the application (instead of evolution directly importing project files), this should go in the project
import { SurveyContext, surveyReducer } from 'evolution-frontend/lib/contexts/SurveyContext';
import appConfig, { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import '../../../styles/survey/styles-survey.scss';
  
// TODO This is a workaround to get the links to the user, until some more complete solution is implemented (see https://github.com/chairemobilite/transition/issues/1516)
const pages = [
    { path: '/admin/validation', permissions: { Interviews: ['validate'] }, title: 'admin:validationPageTitle' },
    { path: '/admin/monitoring', permissions: { Interviews: ['manage'] }, title: 'admin:monitoringPageTitle' },
    { path: '/admin/users', permissions: { Users: ['read', 'update'] }, title: 'admin:usersPageTitle' }
];
setApplicationConfiguration({ homePage: '/home', pages });

export default () => {
    document.title = config.title[i18n.language];

    const history = createBrowserHistory();
    
    const store = configureStore();
    const Jsx = () => {
      const [state, dispatch] = React.useReducer(interviewReducer, initialState);
      const [devMode, dispatchSurvey] = React.useReducer(surveyReducer, { devMode: false });
      return(
        <SurveyContext.Provider value={{ sections: appConfig.sections, widgets: appConfig.widgets, ...devMode, dispatch: dispatchSurvey }}>
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
    
    fetch('/verifyAuthentication', { credentials: 'include' }).then((response) => {
      //console.log('verifying authentication');
      if (response.status === 200) {
        // authorized (user authentication succeeded)
        response.json().then((body) => {
          if (body.user)
          {
            store.dispatch(login(body.user, true));
            renderApp();
          }
          else
          {
            store.dispatch(logout());
            renderApp();
          }
        });
      }
      else if (response.status === 401) {
        store.dispatch(logout());
        renderApp();
        //history.push('/home');
      }
    })
    .catch((err) => {
      console.log('Error logging in.', err);
    });
}
