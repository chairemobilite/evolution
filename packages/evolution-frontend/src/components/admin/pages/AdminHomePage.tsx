/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { NavLink } from 'react-router';
import { withTranslation, WithTranslation } from 'react-i18next';

import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

export interface AdminHomePageProps {
    user: CliUser;
    path: any;
    appName: string;
}

const AdminHomePage: React.FunctionComponent<AdminHomePageProps & WithTranslation> = (
    props: AdminHomePageProps & WithTranslation
) => (
    <div className="admin">
        <div className="survey-section__content apptr__form-container">
            <h2>{props.t('menu:home')}</h2>
            <ul>
                {props.user &&
                    props.user.pages.map((page) => (
                        <li className="tr__top-menu-element" key={`item-${page.title}`}>
                            <NavLink className="menu-button" key={page.title} to={page.path}>
                                {props.t(page.title)}
                            </NavLink>
                        </li>
                    ))}
            </ul>
        </div>
    </div>
);

const mapStateToProps = (state) => {
    return { user: state.auth.user };
};

export default connect(mapStateToProps)(withTranslation('menu')(AdminHomePage));
