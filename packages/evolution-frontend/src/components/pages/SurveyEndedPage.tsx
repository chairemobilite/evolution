/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

import config from 'evolution-common/lib/config/project.config';

const SurveyEndedPage: React.FunctionComponent = () => {
    const { t, i18n } = useTranslation();

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
                        {config.logoPaths && (
                            <div className="main-logo center">
                                <img src={config.logoPaths[i18n.language]} style={{ width: '100%' }} alt="Logo" />
                            </div>
                        )}
                        <div
                            dangerouslySetInnerHTML={{
                                __html: t('survey:surveyEnded.thankYouMessage')
                            }}
                        />
                        <div className="center">
                            {config.languages.map((language) => {
                                return i18n.language !== language ? (
                                    <button
                                        type="button"
                                        className="menu-button em"
                                        key={`header__nav-language-${language}`}
                                        onClick={() => {
                                            i18n.changeLanguage(language);
                                            moment.locale(language);
                                        }}
                                    >
                                        {config.languageNames[language]}
                                    </button>
                                ) : null;
                            })}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SurveyEndedPage;
