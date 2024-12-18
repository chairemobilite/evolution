/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Navigate, RouteProps, useLocation } from 'react-router';

import { Header } from 'chaire-lib-frontend/lib/components/pageParts';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/configureStore';

type ConsentedRouteProps = RouteProps & {
    componentProps?: { [prop: string]: unknown };
    component: any;
    config?: { [key: string]: unknown };
};

export const ConsentedRoute = ({
    component: Component,
    componentProps,
    config,
    path
}: ConsentedRouteProps & RouteProps) => {
    const location = useLocation();
    const hasConsented = useSelector((state: RootState) => !!state.survey.hasConsent);
    const isAuthenticated = useSelector((state: RootState) => !!state.auth.isAuthenticated);

    return isAuthenticated || hasConsented ? (
        <React.Fragment>
            <Header appName={config?.appName as string} path={path as string} />
            <Component location={location} {...componentProps} />
        </React.Fragment>
    ) : (
        <Navigate
            to={{
                pathname: '/',
                search: location.search
            }}
            state={{ referrer: location }}
        />
    );
};

export default ConsentedRoute;
