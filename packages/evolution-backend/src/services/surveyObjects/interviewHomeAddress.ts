/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

const isPlainObject = (value: unknown): value is { [key: string]: unknown } =>
    typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor === Object;

const definedValue = (container: { [key: string]: unknown } | undefined, key: string): unknown => {
    const value = container?.[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return undefined;
    }
    return value;
};

/**
 * Copy questionnaire home address fields onto `_address`.
 * The questionnaire stores `address`, `city`, `region`, `country`, `postalCode`
 * and `apartmentNumber`. `Address` stores `fullAddress`, `municipalityName`,
 * `region`, `country`, `postalCode` and `unitNumber`.
 * A value already on `_address` wins. `address` as an object is the same input as `_address`.
 * Questionnaire names are removed so they do not become custom attributes.
 * @param attributes Home attributes from the interview or a parser
 * @returns A shallow copy with the address on `_address`
 */
export const mapInterviewHomeAddress = (attributes: { [key: string]: unknown }): { [key: string]: unknown } => {
    const mapped: { [key: string]: unknown } = { ...attributes };
    const fromUnderscore = isPlainObject(attributes._address) ? attributes._address : undefined;
    const fromAddress = isPlainObject(attributes.address) ? attributes.address : undefined;
    const address: { [key: string]: unknown } = {};
    for (const source of [fromUnderscore, fromAddress]) {
        if (source === undefined) {
            continue;
        }
        for (const [key, value] of Object.entries(source)) {
            if (
                key === 'address' ||
                key === 'city' ||
                key === 'apartmentNumber' ||
                value === undefined ||
                value === null ||
                address[key] !== undefined
            ) {
                continue;
            }
            address[key] = value;
        }
    }

    const assign = (addressKey: string, ...candidates: unknown[]) => {
        if (address[addressKey] !== undefined) {
            return;
        }
        const value = candidates.find((candidate) => candidate !== undefined);
        if (value !== undefined) {
            address[addressKey] = value;
        }
    };

    const street = (container: { [key: string]: unknown } | undefined): unknown => {
        const value = definedValue(container, 'address');
        return isPlainObject(value) ? undefined : value;
    };

    assign(
        'fullAddress',
        definedValue(fromUnderscore, 'fullAddress'),
        definedValue(fromAddress, 'fullAddress'),
        street(fromUnderscore),
        street(fromAddress),
        street(attributes),
        definedValue(attributes, 'fullAddress')
    );
    assign(
        'municipalityName',
        definedValue(fromUnderscore, 'municipalityName'),
        definedValue(fromAddress, 'municipalityName'),
        definedValue(fromUnderscore, 'city'),
        definedValue(fromAddress, 'city'),
        definedValue(attributes, 'municipalityName'),
        definedValue(attributes, 'city')
    );
    assign(
        'unitNumber',
        definedValue(fromUnderscore, 'unitNumber'),
        definedValue(fromAddress, 'unitNumber'),
        definedValue(fromUnderscore, 'apartmentNumber'),
        definedValue(fromAddress, 'apartmentNumber'),
        definedValue(attributes, 'unitNumber'),
        definedValue(attributes, 'apartmentNumber')
    );
    for (const key of ['region', 'country', 'postalCode'] as const) {
        assign(key, definedValue(fromUnderscore, key), definedValue(fromAddress, key), definedValue(attributes, key));
    }

    if (Object.keys(address).length > 0) {
        mapped._address = address;
    }

    for (const key of [
        'address',
        'city',
        'apartmentNumber',
        'fullAddress',
        'municipalityName',
        'unitNumber',
        'region',
        'country',
        'postalCode'
    ]) {
        delete mapped[key];
    }
    return mapped;
};
