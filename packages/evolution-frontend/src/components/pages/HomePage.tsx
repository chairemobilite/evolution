/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-frontend
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import moment from 'moment';
import { History, Location } from 'history';
import { Dispatch } from 'redux';

import { startRegister } from '../../actions/Auth';
import config from 'evolution-common/lib/config/project.config';
import ConsentAndStartForm from '../pageParts/ConsentAndStartForm';
import { InterviewContext } from '../../contexts/InterviewContext';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { AnyAction } from 'redux';

type HomePageProps = {
    isAuthenticated: boolean;
    user: CliUser;
    history: History;
    location: Location;
    dispatch: Dispatch<AnyAction>;
} & WithTranslation;

class HomePage extends React.Component<HomePageProps> {
    static contextType = InterviewContext;

    constructor(props) {
        super(props);

        if (this.props.isAuthenticated === true) {
            const goToPage = this.props.user && this.props.user.homePage ? this.props.user.homePage : '/survey';
            // Avoid infinite loops
            this.props.history.push(goToPage === '' || goToPage === '/' ? '/survey' : goToPage);
        }
    }

    componentDidMount() {
        // If there is a query string, add to the responses
        if (this.props.location.search && this.props.location.search !== '') {
            const { state, dispatch } = this.context;
            if (state.status !== 'entering') {
                dispatch({ type: 'enter', queryData: new URLSearchParams(this.props.location.search) });
            }
        }
    }

    afterClick = () => this.props.history.push({ pathname: '/login', search: this.props.location.search });

    render = () => (
        <div className="survey">
            <div style={{ width: '100%', margin: '0 auto', maxWidth: '60em' }}>
                {config.introBanner && config.bannerPaths && (
                    <div className="main-logo center">
                        <img
                            src={config.bannerPaths[this.props.i18n.language]}
                            style={{ width: '100%' }}
                            alt="Banner"
                        />
                    </div>
                )}
                <div style={{ width: '100%', margin: '0 auto', maxWidth: '30em', padding: '0 1rem' }}>
                    <form className="apptr__form" id="survey_form">
                        {!config.introLogoAfterStartButton && config.logoPaths && (
                            <div className="main-logo center">
                                <img
                                    src={config.logoPaths[this.props.i18n.language]}
                                    style={{ width: '100%' }}
                                    alt="Logo"
                                />
                            </div>
                        )}
                        <div dangerouslySetInnerHTML={{ __html: this.props.t('survey:homepage:introduction') }} />
                        {config.hideStartButtonOnHomePage !== true && (
                            <ConsentAndStartForm afterClicked={this.afterClick} />
                        )}
                        {config.introLogoAfterStartButton && config.logoPaths && (
                            <div className="main-logo center">
                                <img
                                    src={config.logoPaths[this.props.i18n.language]}
                                    style={{ width: '100%' }}
                                    alt="Logo"
                                />
                            </div>
                        )}
                        {config.introductionTwoParagraph && (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: this.props.t('survey:homepage:introductionParagraphTwo')
                                }}
                            />
                        )}
                        <div className="center">
                            {config.languages.map((language) => {
                                // TODO: make sure it would work with more than two langages (css and formatting)
                                return this.props.i18n.language !== language ? (
                                    <a
                                        href="#"
                                        className="em"
                                        key={`header__nav-language-${language}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.props.i18n.changeLanguage(language);
                                            moment.locale(this.props.i18n.language);
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
}

const mapStateToProps = (state, _props) => {
    return {
        user: state.auth.user,
        isAuthenticated: !!state.auth.isAuthenticated
    };
};

const mapDispatchToProps = (dispatch, _props) => ({
    startRegister: (data, history) => dispatch(startRegister(data, history))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(HomePage));
