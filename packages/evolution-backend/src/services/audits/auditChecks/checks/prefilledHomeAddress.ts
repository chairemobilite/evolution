/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Address } from 'evolution-common/lib/services/baseObjects/Address';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';

/** CSV columns copied into `home.preData`, and the `Address` field the parser stores them in. */
const prefilledAddressFields: ReadonlyArray<readonly [string, keyof Address]> = [
    ['Address', 'fullAddress'],
    ['City', 'municipalityName'],
    ['Province', 'region'],
    ['PostalCode', 'postalCode']
];

const addressText = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim());

/**
 * True when a pre-filled address field differs from the declared home address.
 * A missing pre-filled address is not an edit.
 * @param home Home being audited
 */
export const prefilledHomeAddressWasEdited = (home: Home): boolean => {
    const preData = home.preData;
    if (preData === undefined) {
        return false;
    }
    const hadPrefilledAddress = prefilledAddressFields.some(([preDataKey]) => addressText(preData[preDataKey]) !== '');
    if (!hadPrefilledAddress) {
        return false;
    }
    return prefilledAddressFields.some(
        ([preDataKey, addressKey]) => addressText(preData[preDataKey]) !== addressText(home.address?.[addressKey])
    );
};
