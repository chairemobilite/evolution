/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import InputRadioNumber from "../InputRadioNumber";
import {UserPermissions} from "chaire-lib-common/lib/services/user/userType";

describe('Render InputRadioNumber', () => {
    const widgetConfig = {
        inputType: 'radioNumber' as const,
        valueRange: { min: 1, max: 3 },
        overMaxAllowed: false
    }

    const widgetConfigOverMax = {
        inputType: 'radioNumber' as const,
        valueRange: { min: 1, max: 3 },
        overMaxAllowed: true
    }

    const interview = {
        id: 1,
        uuid: "",
        participant_id: 1,
        is_completed: false,
        responses: {},
        validations: {},
        is_valid: true
    }

    const user = {
        id: 1,
        username: '',
        serializedPermissions: [],
        preferences: {},
        isAuthorized: (permissions: UserPermissions) => false,
        is_admin: false,
        pages: [],
        showUserInfo: false,
    }

    test('InputRadioNumber without "over max" option', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfig}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('InputRadioNumber with "over max" option', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
             interview={interview} path={''} user={user}/>
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('InputRadioNumber with selected value', () => {
        const wrapper = TestRenderer.create(
            <InputRadioNumber
                id={'test'}
                value={4}
                widgetConfig={widgetConfigOverMax}
                onValueChange={(e) => null}
                interview={interview} path={''} user={user}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });
});