import React from 'react';
import { useTranslation } from 'react-i18next';

import appConfiguration from 'chaire-lib-frontend/lib/config/application.config';
import config from 'evolution-common/lib/config/project.config';
import AnonymousLogin from 'chaire-lib-frontend/lib/components/forms/auth/anonymous/AnonymousLogin';
import PwdLessLoginForm from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/PwdLessLoginForm';
import DirectTokenLogin from './DirectTokenLogin';
import { connect, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { RootState } from '../../../store/configureStore';

// These authentication methods are managed differently and not in the wrapped component
const unmanagedAuthMethods = ['facebook', 'google', 'anonymous', 'directToken'];

const PasswordLess = (props: { authMethods: string[] }) => {
    const { t } = useTranslation(['survey', 'auth']);
    if (!props.authMethods.includes('passwordless')) {
        return null;
    } else {
        return (
            <div className="apptr__auth-box">
                <PwdLessLoginForm
                    headerText={t(['survey:auth:PasswordlessHeader', 'auth:PasswordlessHeader'])}
                    buttonText={t(['survey:auth:Login', 'auth:Login'])}
                />
                <div className="apptr__separator"></div>
            </div>
        );
    }
};

const AuthPage: React.FunctionComponent = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['survey', 'auth']);
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    const [anonymousRequested, setAnonymousRequested] = React.useState(false);

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate(appConfiguration.homePage);
        }
    }, []);

    let surveyContainerStyle = {};
    if (config.logoPaths) {
        surveyContainerStyle = {
            backgroundImage: `url(${
                config.logoPaths[i18n.language]
            }), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
            backgroundSize: '15rem, 6rem',
            backgroundPosition: 'left 1rem bottom 1rem, right 1rem top 100.5%',
            backgroundRepeat: 'no-repeat, no-repeat'
        };
    }

    // Keep supported methods which have their own forms in the app, not external logins
    const authMethods = React.useMemo(
        () =>
            config.auth
                ? Object.keys(config.auth).filter(
                    (authMethod) => config.auth[authMethod] !== false && !unmanagedAuthMethods.includes(authMethod)
                )
                : ['passwordless'],
        []
    );

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

    const selectAnonymousLogin = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        setAnonymousRequested(true);
    };

    return (
        <div className="survey" style={surveyContainerStyle}>
            <div style={{ width: '100%', margin: '0 auto', maxWidth: '90em' }}>
                <div className="apptr__separator"></div>
                <p
                    className="_center _large"
                    style={{ marginBottom: '1rem', paddingLeft: '2rem', paddingRight: '2rem' }}
                >
                    {t(['survey:auth:AuthMainIntroduction', 'auth:AuthMainIntroduction'])}
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
                    <PasswordLess authMethods={authMethods} />
                    {hasNoAuthMethodsExeptDirectToken && (
                        <div className="apptr__auth-box">
                            {/* Show a message only if there are no login methods available */}
                            {hasNoAuthMethodsExeptDirectToken && (
                                <div>{t(['survey:auth:UseNoLoginAuthMethod', 'auth:UseNoLoginAuthMethod'])}</div>
                            )}
                        </div>
                    )}

                    {(config.auth?.google || config.auth?.facebook) && (
                        <div className="apptr__auth-box">
                            <p className="_label apptr__form__label-standalone">
                                {t(['survey:auth:OAuthTitle', 'auth:OAuthTitle'])}
                            </p>
                            {config.auth?.google && (
                                <div className="google-oauth-button-container apptr_form-oauth-google-login">
                                    <a className="google-oauth-button" href="/googlelogin">
                                        {t('auth:signInWithGoogle')}
                                    </a>
                                </div>
                            )}
                            {config.auth?.facebook && (
                                <div className="facebook-oauth-button-container apptr_form-oauth-facebook-login">
                                    <a className="facebook-oauth-button" href="/facebooklogin">
                                        {t('auth:signInWithFacebook')}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {config.auth.anonymous === true && (
                        <div className="apptr__auth-box">
                            {config.auth.anonymous === true &&
                                (anonymousRequested === true ? (
                                    <AnonymousLogin />
                                ) : (
                                    <div className={'apptr__form-label-container apptr_form-anonymous'}>
                                        <p className="_label apptr__form__label-standalone">
                                            {t(['survey:auth:AuthAnonymousTitle', 'auth:AuthAnonymousTitle'])}
                                        </p>
                                        <div className="apptr__form__label-standalone no-question apptr_form-anonymous-explanation">
                                            <p>
                                                <span className="_red">
                                                    {t(['survey:auth:Warning', 'auth:Warning'])}
                                                </span>
                                                <span className="_pale">
                                                    :{' '}
                                                    {t([
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
                                                {t(['survey:auth:UseAnonymousLogin', 'auth:UseAnonymousLogin'])}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                    {config.auth.directToken !== false && config.auth.directToken !== undefined && <DirectTokenLogin />}
                </div>
                <div
                    className={'apptr__form-label-container apptr_form-why-login-info'}
                    style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                >
                    <div className="apptr__form__label-standalone no-question _oblique">
                        <p>{t(['survey:auth:WhyLoginInfo', 'auth:WhyLoginInfo'])}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const mapStateToProps = (state) => {
    return { isAuthenticated: state.auth.isAuthenticated, login: state.auth.login };
};

export default connect(mapStateToProps)(AuthPage);
