/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-frontend
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import moment from 'moment';

import config from 'evolution-common/lib/config/project.config';
import ConsentAndStartForm from '../pageParts/ConsentAndStartForm';
import { InterviewContext } from '../../contexts/InterviewContext';
import { SurveyContext } from '../../contexts/SurveyContext';
import { useLocation, useNavigate } from 'react-router';
import { RootState } from '../../store/configureStore';

const HomePage: React.FunctionComponent = () => {
    const { state, dispatch } = React.useContext(InterviewContext);
    const { appContext } = React.useContext(SurveyContext);
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useSelector((state: RootState) => !!state.auth.isAuthenticated);
    const { t, i18n } = useTranslation();

    React.useEffect(() => {
        if (isAuthenticated === true) {
            const goToPage = user && user.homePage ? user.homePage : '/survey';
            // Avoid infinite loops
            navigate(goToPage === '' || goToPage === '/' ? '/survey' : goToPage);
        }
        // If there is a query string, add to the response
        if (location.search && location.search !== '') {
            if (state.status !== 'entering') {
                dispatch({ type: 'enter', queryData: new URLSearchParams(location.search) });
            }
        }
    }, []);

    const afterClick = () => navigate({ pathname: '/login', search: location.search });

    return (
        <div className="survey">
            <div style={{ width: '100%', margin: '0 auto', maxWidth: '60em' }}>
                {config.introBanner && config.bannerPaths && (
                    <div className="main-logo center">
                        <img src={config.bannerPaths[i18n.language]} style={{ width: '100%' }} alt="Banner" />
                    </div>
                )}
                <div style={{ width: '100%', margin: '0 auto', maxWidth: '30em', padding: '0 1rem' }}>
                    <form className="apptr__form" id="survey_form">
                        {!config.introLogoAfterStartButton && config.logoPaths && (
                            <div className="main-logo center">
                                <img src={config.logoPaths[i18n.language]} style={{ width: '100%' }} alt="Logo" />
                            </div>
                        )}
                        <div
                            dangerouslySetInnerHTML={{
                                __html: t('survey:homepage:introduction', { context: appContext })
                            }}
                        />
                        {config.hideStartButtonOnHomePage !== true && <ConsentAndStartForm afterClicked={afterClick} />}
                        {config.introLogoAfterStartButton && config.logoPaths && (
                            <div className="main-logo center">
                                <img src={config.logoPaths[i18n.language]} style={{ width: '100%' }} alt="Logo" />
                            </div>
                        )}
                        {config.introductionTwoParagraph && (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: t('survey:homepage:introductionParagraphTwo', { context: appContext })
                                }}
                            />
                        )}
                        <div className="center">
                            {config.languages.map((language) => {
                                // TODO: make sure it would work with more than two langages (css and formatting)
                                return i18n.language !== language ? (
                                    <a
                                        href="#"
                                        className="em"
                                        key={`header__nav-language-${language}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            i18n.changeLanguage(language);
                                            moment.locale(i18n.language);
                                        }}
                                    >
                                        {config.languageNames[language]}
                                    </a>
                                ) : (
                                    ''
                                );
                            })}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
