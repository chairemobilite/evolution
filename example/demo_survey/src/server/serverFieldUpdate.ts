/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export default [
    {
        field: 'accessCode',
        callback: (interview, value, path) => {
            // Sample server update: Move the home to Caraquet, NB if access code starts with 111 and the city is not set
            if (value.startsWith('111')) {
                if (_isBlank(getResponse(interview, 'home.city'))) {
                    return {
                        'home.city': 'Caraquet',
                        'home.region': 'New Brunswick'
                    };
                }
            } else if (value.startsWith('999')) {
                // Move the home to London, Ontario if code starts with 999 even if city is set
                return {
                    'home.city': 'London',
                    'home.region': 'Ontario'
                };
            } else if (value === '1133-1133') {
                // Special access code to test url redirection
                return [{}, 'https://github.com/chairemobilite/evolution/']
            }
            return {};
        }
    }
];
