/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { connect } from 'react-redux';
import { withTranslation, WithTranslation } from 'react-i18next';
import { History, Location } from 'history';

import { startDirectTokenLogin } from '../../../actions/Auth';

export interface DirectTokenLoginProps {
    isAuthenticated?: boolean;
    history: History;
    location: Location;
    startDirectTokenLogin: (callback?: () => void) => void;
    login?: boolean;
}

export const DirectTokenLogin: React.FunctionComponent<DirectTokenLoginProps & WithTranslation> = (
    props: DirectTokenLoginProps & WithTranslation
) => {
    React.useEffect(() => {
        props.startDirectTokenLogin();
    }, []);
    return null;
};

const mapStateToProps = (state) => {
    return { isAuthenticated: state.auth.isAuthenticated, login: state.auth.login };
};

const mapDispatchToProps = (dispatch, props: Omit<DirectTokenLoginProps, 'startDirectTokenLogin'>) => ({
    startDirectTokenLogin: (callback?: () => void) =>
        dispatch(startDirectTokenLogin(props.history, props.location, callback))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation('auth')(DirectTokenLogin));
