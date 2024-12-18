/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Link } from 'react-router';
import { withTranslation, WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';

interface UnauthorizedPageProps {
    isAuthenticated?: boolean;
}

export const UnauthorizedPage: React.FunctionComponent<UnauthorizedPageProps & WithTranslation> = (
    props: UnauthorizedPageProps & WithTranslation
) => (
    <div className="survey" style={{ display: 'block' }} id="unauthorizedPage">
        <div className="apptr__form">
            {props.t(props.isAuthenticated === true ? 'Unauthorized' : 'SessionHasExpired')}
        </div>
        <div className="apptr__separator"></div>
        <div className="apptr__form">
            <Link to="/login">{props.t('BackToLoginPage')}</Link>
        </div>
    </div>
);

const mapStateToProps = (state) => {
    return { isAuthenticated: state.auth.isAuthenticated, login: state.auth.login };
};

export default connect(mapStateToProps)(withTranslation(['auth'])(UnauthorizedPage));
