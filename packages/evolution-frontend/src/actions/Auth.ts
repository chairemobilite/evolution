/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { BaseUser } from 'chaire-lib-common/lib/services/user/userType';
import { History, Location } from 'history';
import { login, redirectAfterLogin } from 'chaire-lib-frontend/lib/actions/Auth';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const startDirectTokenLogin = (history: History, location: Location, callback?: () => void) => {
    return async (dispatch) => {
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
                        dispatch(callback());
                    }
                    redirectAfterLogin(user, history, location);
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
