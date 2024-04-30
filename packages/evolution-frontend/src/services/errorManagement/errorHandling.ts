/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { History } from 'history';
import { Dispatch } from 'redux';
import verifyAuthentication from 'chaire-lib-frontend/lib/services/auth/verifyAuthentication';

const unauthorizedPage = '/unauthorized';
const errorPage = '/error';

export const handleHttpOtherResponseCode = async (responseCode: number, dispatch: Dispatch, history?: History) => {
    if (responseCode === 401) {
        // Verify authentication, so that we get the new authentication status
        // from the server. At this point, it is not possible to know if the 401
        // is for a specific query, or if the user's session has ended.
        await verifyAuthentication(dispatch);
        if (history) {
            history.push(unauthorizedPage);
        }
        // If history is not available, the user has still been logged out of
        // the application, the proper flow of the application will redirect him
        // to the right page (login or unauthorized). We don't need to set href
        // to 'unauthorized' here.
    } else if (history) {
        // TODO Should there be other use cases that lead to other pages?
        history.push(errorPage);
    } else {
        // Error messages need proper handling, if history is not available, we
        // still need to redirect to error page
        window.location.href = errorPage;
    }
};
