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

type ConsentedRouteProps = {
    isAuthenticated: boolean;
    hasConsented: boolean;
    component: any;
} & any;

// TODO: Refactor this component so it doesn't need to use `...rest` in its props.
export const ConsentedRoute = ({
    isAuthenticated,
    hasConsented,
    component: Component,
    ...rest
}: ConsentedRouteProps) => (
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
                        state: { referrer: props.location },
                        search: props.location.search
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
