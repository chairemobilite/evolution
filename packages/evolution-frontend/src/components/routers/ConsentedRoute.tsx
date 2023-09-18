/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';

import { Header } from 'chaire-lib-frontend/lib/components/pageParts';

export const ConsentedRoute = ({ isAuthenticated, hasConsented, component: Component, config, ...rest }) => (
    <Route
        {...rest}
        component={(props) => {
            return isAuthenticated || hasConsented ? (
                <React.Fragment>
                    <Header {...props} path={rest.path} />
                    <Component {...props} location={rest.location} {...rest.componentProps} />
                </React.Fragment>
            ) : (
                <Redirect
                    to={{
                        pathname: '/',
                        state: { referrer: props.location }
                    }}
                />
            );
        }}
    />
);

const mapStateToProps = (state) => ({
    hasConsented: !!state.survey.hasConsent,
    isAuthenticated: !!state.auth.uuid
});

export default connect(mapStateToProps)(ConsentedRoute);
