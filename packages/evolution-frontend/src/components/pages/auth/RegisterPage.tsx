/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';

import config from 'chaire-lib-common/lib/config/shared/project.config';
import RegisterForm from 'chaire-lib-frontend/lib/components/forms/auth/localLogin/RegisterForm';
import PwdLessLoginForm from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/PwdLessLoginForm';
import authPageHOC, { AuthPageProps } from './AuthPageHOC';

const registerWithEmailOnly = config.registerWithEmailOnly || config.auth?.localLogin?.registerWithEmailOnly;

export type RegisterPageProps = AuthPageProps;

const RegisterPage: React.FunctionComponent<RegisterPageProps & { authMethod: string } & WithTranslation> = (
    props: RegisterPageProps & { authMethod: string } & WithTranslation
) => {
    if (config.allowRegistration === false) {
        return null;
    }
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
    case 'localLogin':
        return (
            <React.Fragment>
                <RegisterForm
                    history={props.history}
                    withEmailOnly={registerWithEmailOnly}
                    introductionText={props.t([
                        'survey:auth:pleaseChooseAUsernameOrEnterYourEmailAndAPassword',
                        'auth:pleaseChooseAUsernameOrEnterYourEmailAndAPassword'
                    ])}
                />
                <div className="apptr__separator"></div>
                <div className="center">
                    <a className="login-link _oblique" href="/login">
                        {props.t(['survey:auth:iAlreadyHaveAnAccount', 'auth:iAlreadyHaveAnAccount'])}
                    </a>
                </div>
            </React.Fragment>
        );
    default:
        return null;
    }
};

const mapStateToProps = (state) => {
    return { isAuthenticated: state.auth.isAuthenticated, register: state.auth.register };
};

export default authPageHOC(connect(mapStateToProps)(withTranslation('auth')(RegisterPage)));
