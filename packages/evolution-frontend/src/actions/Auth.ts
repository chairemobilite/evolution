/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { BaseUser } from 'chaire-lib-common/lib/services/user/userType';
import { Location, NavigateFunction } from 'react-router';
import { Dispatch } from 'redux';
import { login, redirectAfterLogin } from 'chaire-lib-frontend/lib/actions/Auth';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as AuthBase from 'chaire-lib-frontend/lib/actions/Auth';

export const startDirectTokenLogin = (location: Location, navigate: NavigateFunction, callback?: () => void) => {
    return async (dispatch: Dispatch) => {
        try {
            const urlSearch = new URLSearchParams(location.search);
            if (_isBlank(urlSearch.get('access_token'))) {
                // No access token, just return and don't do any other dispatch
                return;
            }
            const response = await fetch(`/direct-token?access_token=${urlSearch.get('access_token')}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 200) {
                const { user }: { user: BaseUser | undefined } = await response.json();
                if (user) {
                    dispatch(login(user, true, true, false));
                    if (typeof callback === 'function') {
                        dispatch((callback as any)());
                    }
                    redirectAfterLogin(user, location, navigate);
                } else {
                    dispatch(login(null, false, true, false));
                }
            } else {
                // Any other response status should not authenticate but still give feedback to the user
                dispatch(login(null, false, false, true));
                console.error('Error trying to log in: ', response);
            }
        } catch (err) {
            dispatch(login(null, false, false, true));
            console.log('Error logging in.', err);
        }
    };
};

// TODO: Is commented in chaire-lib-frontend
export const startRegister = (data: any, navigate: NavigateFunction) => {
    return (dispatch: Dispatch, _getState) => {
        return fetch('/register', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((body) => {
                        if (body.user) {
                            dispatch(login(body.user, true, true, false));
                            const defaultPath = process.env.APP_NAME === 'survey' ? '/survey' : '/dashboard';
                            return navigate(defaultPath);
                        } else {
                            dispatch(login(null, false, true, false));
                        }
                    });
                } else {
                    dispatch(login(null, false, true, false));
                }
            })
            .catch((err) => {
                console.log('Error during registration.', err);
            });
    };
};

export const startRegisterWithPassword = AuthBase.startRegisterWithPassword;

export const startForgotPasswordRequest = AuthBase.startForgotPasswordRequest;
