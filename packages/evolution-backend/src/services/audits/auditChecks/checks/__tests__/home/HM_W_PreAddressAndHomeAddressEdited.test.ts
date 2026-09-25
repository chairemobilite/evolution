/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Address } from 'evolution-common/lib/services/baseObjects/Address';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';

const address = (fields: Partial<Address>): Address => fields as Address;

describe('HM_W_PreAddressAndHomeAddressEdited', () => {
    const homeUuid = uuidV4();

    const warning = {
        objectType: 'home',
        objectUuid: homeUuid,
        errorCode: 'HM_W_PreAddressAndHomeAddressEdited',
        version: 1,
        level: 'warning',
        message: 'Pre-filled home address was edited',
        ignore: false
    };

    test.each([
        {
            description: 'unchanged address',
            preData: { Address: '123 rue Principale', City: 'Montréal', Province: 'QC', PostalCode: 'H2X 1Y4' },
            declared: address({
                fullAddress: '123 rue Principale',
                municipalityName: 'Montréal',
                region: 'QC',
                postalCode: 'H2X 1Y4'
            }),
            edited: false
        },
        {
            description: 'street edited',
            preData: { Address: '123 rue Principale', City: 'Montréal' },
            declared: address({ fullAddress: '125 rue Principale', municipalityName: 'Montréal' }),
            edited: true
        },
        {
            description: 'city edited',
            preData: { Address: '123 rue Principale', City: 'Montréal' },
            declared: address({ fullAddress: '123 rue Principale', municipalityName: 'Laval' }),
            edited: true
        },
        {
            description: 'postal code edited',
            preData: { PostalCode: 'H2X 1Y4' },
            declared: address({ postalCode: 'H3A 1A1' }),
            edited: true
        },
        {
            description: 'province edited',
            preData: { Province: 'QC' },
            declared: address({ region: 'ON' }),
            edited: true
        },
        {
            description: 'no pre-filled address',
            preData: { 'ep.exclusive': 'omission' },
            declared: address({ fullAddress: '123 rue Principale' }),
            edited: false
        },
        {
            description: 'no preData',
            preData: undefined,
            declared: address({ fullAddress: '123 rue Principale' }),
            edited: false
        }
    ])('$description', ({ preData, declared, edited }) => {
        const context = createContextWithHome({ preData, address: declared }, homeUuid);
        const result = homeAuditChecks.HM_W_PreAddressAndHomeAddressEdited(context);

        if (edited) {
            expect(result).toEqual(warning);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
