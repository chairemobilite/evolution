/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Preferences from 'chaire-lib-common/lib/config/Preferences';
import { LoadingPage } from 'chaire-lib-frontend/lib/components/pages';

export const withPreferencesHOC = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    const PreferencesComponentHOC: React.FunctionComponent<P> = (props: P) => {
        const [preferencesLoaded, setPreferencesLoaded] = React.useState(false);
        React.useEffect(() => {
            Preferences.load().then(() => {
                setPreferencesLoaded(true);
            });
        }, []);
        return preferencesLoaded ? <WrappedComponent {...(props as P)} /> : <LoadingPage />;
    };
    return PreferencesComponentHOC;
};
