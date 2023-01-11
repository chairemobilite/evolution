/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';

import LoginForm from 'chaire-lib-frontend/lib/components/forms/auth/localLogin/LoginForm';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import PwdLessLoginForm from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/PwdLessLoginForm';
import authPageHOC, { AuthPageProps } from './AuthPageHOC';

export interface LoginPageProps extends AuthPageProps {
    login?: boolean;
}

const LoginPage: React.FunctionComponent<LoginPageProps & { authMethod: string } & WithTranslation> = (
    props: LoginPageProps & { authMethod: string } & WithTranslation
) => {
    switch (props.authMethod) {
    case 'passwordless':
        return (
            <PwdLessLoginForm
                history={props.history}
                location={props.location}
                headerText={props.t(['survey:auth:PasswordlessHeader', 'auth:PasswordlessHeader'])}
                buttonText={props.t(['survey:auth:Login', 'auth:Login'])}
            />
        );
    case 'localLogin': {
        const allowRegistration =
                config.allowRegistration !== false && config.auth?.localLogin?.allowRegistration !== false;
        return (
            <React.Fragment>
                <LoginForm
                    history={props.history}
                    location={props.location}
                    withForgotPassword={
                        config.forgotPasswordPage === true || config.auth?.localLogin?.forgotPasswordPage === true
                    }
                />
                <div className="apptr__separator"></div>
                {config.isPartTwo !== true && allowRegistration !== false && (
                    <div className="center">
                        <a className="register-link _oblique" href="/register">
                            {props.t(['survey:auth:registerIfYouHaveNoAccount', 'auth:registerIfYouHaveNoAccount'])}
                        </a>
                    </div>
                )}
            </React.Fragment>
        );
    }
    default:
        return null;
    }
};

const mapStateToProps = (state) => {
    return { isAuthenticated: state.auth.isAuthenticated, login: state.auth.login };
};

export default authPageHOC(connect(mapStateToProps)(withTranslation('auth')(LoginPage)));
