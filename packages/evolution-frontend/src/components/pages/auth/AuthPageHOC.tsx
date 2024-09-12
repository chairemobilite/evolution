import React from 'react';
import { connect } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';
import { History, Location } from 'history';

import appConfiguration from 'chaire-lib-frontend/lib/config/application.config';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import AnonymousLogin from 'chaire-lib-frontend/lib/components/forms/auth/anonymous/AnonymousLogin';
import DirectTokenLogin from './DirectTokenLogin';

export interface InjectedProps {
    isAuthenticated?: boolean;
}

export interface AuthPageProps extends InjectedProps {
    history: History;
    location: Location;
    authMethod: string;
    translatableButtonText?: string;
}

// These authentication methods are managed differently and not in the wrapped component
const unmanagedAuthMethods = ['facebook', 'google', 'anonymous', 'directToken'];

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
                    ? Object.keys(config.auth).filter((authMethod) => !unmanagedAuthMethods.includes(authMethod))
                    : ['localLogin'],
            []
        );
        const [currentAuthMethod, setCurrentAuthMethod] = React.useState(config.primaryAuthMethod || authMethods[0]);
        const [anonymousRequested, setAnonymousRequested] = React.useState(false);

        React.useEffect(() => {
            if (props.isAuthenticated) {
                props.history.push(appConfiguration.homePage);
            }
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

        const selectAnonymousLogin = (e: React.MouseEvent | React.KeyboardEvent) => {
            e.preventDefault();
            setAnonymousRequested(true);
        };

        const selectAuthMethod = (authMethod: string) => (e: React.MouseEvent | React.KeyboardEvent) => {
            e.preventDefault();
            setCurrentAuthMethod(authMethod);
        };

        // Check if there are no auth methods except directToken
        const hasNoAuthMethodsExeptDirectToken = React.useMemo(() => {
            // Check if there are no auth methods
            const hasNoAuthMethods = authMethods?.length === 0;

            // Check if there are no auth methods in the config
            const hasNoConfigAuth = !Object.entries(config?.auth || {}).some(([key, value]) => {
                // Handle key separately
                if (key === 'directToken') {
                    // 'directToken' is not considered a login method with a widget, so return false
                    return false;
                } else if (key === 'passwordless') {
                    // 'passwordless' is considered a login method with a widget, so return true
                    return true;
                } else {
                    // For other keys like 'anonymous', 'google', 'facebook', etc., check if the value is true
                    return value === true;
                }
            });

            // Make sure that there are no auth methods and no auth methods in the config
            return hasNoAuthMethods && hasNoConfigAuth;
        }, [authMethods, config.auth]); // Update when authMethods or config.auth change

        const { isAuthenticated, ...restProps } = props;

        return (
            <div className="survey" style={surveyContainerStyle}>
                <div style={{ width: '100%', margin: '0 auto', maxWidth: '90em' }}>
                    <div className="apptr__separator"></div>
                    <p
                        className="_center _large"
                        style={{ marginBottom: '1rem', paddingLeft: '2rem', paddingRight: '2rem' }}
                    >
                        {props.t(['survey:auth:AuthMainIntroduction', 'auth:AuthMainIntroduction'])}
                    </p>
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            alignItems: 'stretch',
                            alignContent: 'flex-start'
                        }}
                    >
                        <div className="apptr__auth-box">
                            <WrappedComponent
                                {...(restProps as P)}
                                authMethod={currentAuthMethod}
                                isAuthenticated={isAuthenticated}
                            />
                            <div className="apptr__separator"></div>
                            {/* Show a message only if there are no login methods available */}
                            {hasNoAuthMethodsExeptDirectToken && (
                                <div>{props.t(['survey:auth:UseNoLoginAuthMethod', 'auth:UseNoLoginAuthMethod'])}</div>
                            )}

                            {currentAuthMethod !== 'passwordless' && authMethods.includes('passwordless') && (
                                <div>
                                    <a
                                        className="register-link _oblique"
                                        href="#"
                                        onClick={selectAuthMethod('passwordless')}
                                    >
                                        {props.t([
                                            'survey:auth:UsePasswordLessAuthMethod',
                                            'auth:UsePasswordLessAuthMethod'
                                        ])}
                                    </a>
                                </div>
                            )}
                            {currentAuthMethod !== 'localLogin' && authMethods.includes('localLogin') && (
                                <div>
                                    <a
                                        className="register-link _oblique"
                                        href="#"
                                        onClick={selectAuthMethod('localLogin')}
                                    >
                                        {props.t([
                                            'survey:auth:UseLocalLoginAuthMethod',
                                            'auth:UseLocalLoginAuthMethod'
                                        ])}
                                    </a>
                                </div>
                            )}
                        </div>

                        {(config.connectWithGoogle ||
                            config.auth?.google ||
                            config.connectWithFacebook ||
                            config.auth?.facebook) && (
                            <div className="apptr__auth-box">
                                <p className="_label apptr__form__label-standalone">
                                    {props.t(['survey:auth:OAuthTitle', 'auth:OAuthTitle'])}
                                </p>
                                {/*<div className={'apptr__form-label-container apptr_form-oauth-introduction'}>
                                <div className="apptr__form__label-standalone no-question">
                                    <p className="_green _strong">{props.t(['survey:auth:OAuthIntroduction', 'auth:OAuthIntroduction'])}</p>
                                </div>
                            </div>*/}
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
                            </div>
                        )}

                        {config.auth.anonymous === true && (
                            <div className="apptr__auth-box">
                                {config.auth.anonymous === true &&
                                    (anonymousRequested === true ? (
                                        <AnonymousLogin {...props} />
                                    ) : (
                                        <div className={'apptr__form-label-container apptr_form-anonymous'}>
                                            <p className="_label apptr__form__label-standalone">
                                                {props.t(['survey:auth:AuthAnonymousTitle', 'auth:AuthAnonymousTitle'])}
                                            </p>
                                            <div className="apptr__form__label-standalone no-question apptr_form-anonymous-explanation">
                                                <p>
                                                    <span className="_red">
                                                        {props.t(['survey:auth:Warning', 'auth:Warning'])}
                                                    </span>
                                                    <span className="_pale">
                                                        :{' '}
                                                        {props.t([
                                                            'survey:auth:AnonymousLoginExplanation',
                                                            'auth:AnonymousLoginExplanation'
                                                        ])}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="apptr__form__label-standalone no-question apptr_form-anonymous-login">
                                                <button
                                                    type="button"
                                                    className={'survey-section__button button green'}
                                                    onClick={selectAnonymousLogin}
                                                    onKeyUp={(e) => {
                                                        if (
                                                            e.key === 'enter' ||
                                                            e.key === 'space' ||
                                                            e.which === 13 ||
                                                            e.which === 32
                                                        ) {
                                                            selectAnonymousLogin(e);
                                                        } else {
                                                            return;
                                                        }
                                                    }}
                                                >
                                                    {props.t([
                                                        'survey:auth:UseAnonymousLogin',
                                                        'auth:UseAnonymousLogin'
                                                    ])}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                        {config.auth.directToken !== false && config.auth.directToken !== undefined && (
                            <DirectTokenLogin {...props} />
                        )}
                    </div>
                    <div
                        className={'apptr__form-label-container apptr_form-why-login-info'}
                        style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                    >
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
