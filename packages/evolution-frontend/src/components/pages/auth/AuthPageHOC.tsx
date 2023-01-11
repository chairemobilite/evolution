import React from 'react';
import { connect } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';
import { History, Location } from 'history';

import appConfiguration from 'chaire-lib-frontend/lib/config/application.config';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import AnonymousLogin from 'chaire-lib-frontend/lib/components/forms/auth/anonymous/AnonymousLogin';

export interface InjectedProps {
    isAuthenticated?: boolean;
}

export interface AuthPageProps extends InjectedProps {
    history: History;
    location: Location;
    authMethod: string;
    translatableButtonText?: string;
}

/**
 * TODO Fix and type this class. Look at react hooks which are supposed to be
 * the new way to do hoc in typescript?
 */
const authPageHOC = <P extends AuthPageProps & WithTranslation>(WrappedComponent: React.ComponentType<P>) => {
    const mapStateToProps = (state) => {
        return { isAuthenticated: state.auth.isAuthenticated };
    };
    type HOCProps = ReturnType<typeof mapStateToProps> & AuthPageProps & WithTranslation;

    const AuthPageHOC: React.FunctionComponent<HOCProps> = (props: HOCProps) => {
        // Keep supported methods which have their own forms in the app, not external logins
        const authMethods = React.useMemo(
            () =>
                config.auth
                    ? Object.keys(config.auth).filter(
                        (authMethod) =>
                            authMethod !== 'facebook' && authMethod !== 'google' && authMethod !== 'anonymous'
                    )
                    : ['localLogin'],
            []
        );
        const [currentAuthMethod, setCurrentAuthMethod] = React.useState(config.primaryAuthMethod || authMethods[0]);
        const [anonymousRequested, setAnonymousRequested] = React.useState(false);

        React.useEffect(() => {
            if (props.isAuthenticated) {
                props.history.push(appConfiguration.homePage);
            }
            document.addEventListener('keydown', onKeyPress.bind(this));
            return () => {
                document.removeEventListener('keydown', onKeyPress.bind(this));
            };
        }, []);

        let surveyContainerStyle = {};
        if (config.logoPaths) {
            surveyContainerStyle = {
                backgroundImage: `url(${
                    config.logoPaths[props.i18n.language]
                }), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
                backgroundSize: '15rem, 6rem',
                backgroundPosition: 'left 1rem bottom 1rem, right 1rem top 100.5%',
                backgroundRepeat: 'no-repeat, no-repeat'
            };
        }

        const onKeyPress = (e) => {
            if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */) {
                e.preventDefault();
            }
        };

        const selectAnonymousLogin = (e: React.MouseEvent) => {
            e.preventDefault();
            setAnonymousRequested(true);
        };

        const selectAuthMethod = (authMethod: string) => (e: React.MouseEvent) => {
            e.preventDefault();
            setCurrentAuthMethod(authMethod);
        };

        const { isAuthenticated, ...restProps } = props;

        return (
            <div className="survey" style={surveyContainerStyle}>
                <div style={{ width: '100%', margin: '0 auto', maxWidth: '30em' }}>
                    <WrappedComponent
                        {...(restProps as P)}
                        authMethod={currentAuthMethod}
                        isAuthenticated={isAuthenticated}
                    />
                    <div className="apptr__separator"></div>

                    <div className={'apptr__form-label-container apptr_form-oauth-introduction'}>
                        <div className="apptr__form__label-standalone no-question">
                            <p>{props.t(['survey:auth:OAuthIntroduction', 'auth:OAuthIntroduction'])}</p>
                        </div>
                    </div>
                    {(config.connectWithGoogle || config.auth?.google) && (
                        <div className="google-oauth-button-container apptr_form-oauth-google-login">
                            <a className="google-oauth-button" href="/googlelogin">
                                {props.t('auth:signInWithGoogle')}
                            </a>
                        </div>
                    )}
                    {(config.connectWithFacebook || config.auth?.facebook) && (
                        <div className="facebook-oauth-button-container apptr_form-oauth-facebook-login">
                            <a className="facebook-oauth-button" href="/facebooklogin">
                                {props.t('auth:signInWithFacebook')}
                            </a>
                        </div>
                    )}
                    <div className="apptr__separator"></div>
                    {config.auth.anonymous === true &&
                        (anonymousRequested === true ? (
                            <AnonymousLogin {...props} />
                        ) : (
                            <div className={'apptr__form-label-container apptr_form-anonymous'}>
                                <div className="apptr__form__label-standalone no-question apptr_form-anonymous-explanation">
                                    <p>
                                        {props.t([
                                            'survey:auth:AnonymousLoginExplanation',
                                            'auth:AnonymousLoginExplanation'
                                        ])}
                                    </p>
                                </div>
                                <div className="apptr__form__label-standalone no-question apptr_form-anonymous-login">
                                    <p>
                                        <a className="register-link _oblique" href="#" onClick={selectAnonymousLogin}>
                                            {props.t(['survey:auth:UseAnonymousLogin', 'auth:UseAnonymousLogin'])}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        ))}
                    <div className="apptr__separator"></div>
                    {currentAuthMethod !== 'passwordless' && authMethods.includes('passwordless') && (
                        <div className="center">
                            <a className="register-link _oblique" href="#" onClick={selectAuthMethod('passwordless')}>
                                {props.t(['survey:auth:UsePasswordLessAuthMethod', 'auth:UsePasswordLessAuthMethod'])}
                            </a>
                        </div>
                    )}
                    {currentAuthMethod !== 'localLogin' && authMethods.includes('localLogin') && (
                        <div className="center">
                            <a className="register-link _oblique" href="#" onClick={selectAuthMethod('localLogin')}>
                                {props.t(['survey:auth:UseLocalLoginAuthMethod', 'auth:UseLocalLoginAuthMethod'])}
                            </a>
                        </div>
                    )}
                    <div className={'apptr__form-label-container apptr_form-why-login-info'}>
                        <div className="apptr__form__label-standalone no-question _oblique">
                            <p>{props.t(['survey:auth:WhyLoginInfo', 'auth:WhyLoginInfo'])}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Taken from the typescript handbook: advanced types: https://www.typescriptlang.org/docs/handbook/advanced-types.html
    // Without this, the connect statement had compilation errors
    type Diff<T, U> = T extends U ? never : T;
    return connect<
        ReturnType<typeof mapStateToProps>,
        undefined, // use "undefined" if NOT using dispatchProps
        Diff<P, InjectedProps>,
        any
    >(mapStateToProps)(withTranslation()(AuthPageHOC));
};

export default authPageHOC;
