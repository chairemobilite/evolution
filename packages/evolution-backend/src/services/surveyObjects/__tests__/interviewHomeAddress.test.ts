/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { mapInterviewHomeAddress } from '../interviewHomeAddress';

describe('mapInterviewHomeAddress', () => {
    test.each([
        {
            description: 'questionnaire fields',
            attributes: {
                address: '123 rue Principale',
                city: 'Montréal',
                region: 'QC',
                country: 'Canada',
                postalCode: 'H2X 1Y4',
                apartmentNumber: '3',
                geography: { type: 'Point' }
            },
            address: {
                fullAddress: '123 rue Principale',
                municipalityName: 'Montréal',
                region: 'QC',
                country: 'Canada',
                postalCode: 'H2X 1Y4',
                unitNumber: '3'
            }
        },
        {
            description: 'canonical names on the home',
            attributes: {
                fullAddress: '123 rue Principale',
                municipalityName: 'Montréal',
                unitNumber: '3'
            },
            address: {
                fullAddress: '123 rue Principale',
                municipalityName: 'Montréal',
                unitNumber: '3'
            }
        },
        {
            description: 'address object with questionnaire names',
            attributes: {
                address: { address: '123 rue Principale', city: 'Montréal', region: 'QC' }
            },
            address: { fullAddress: '123 rue Principale', municipalityName: 'Montréal', region: 'QC' }
        },
        {
            description: '_address wins over questionnaire fields',
            attributes: {
                _address: { fullAddress: '10 rue Conservée', municipalityName: 'Laval' },
                address: '123 rue Principale',
                city: 'Montréal'
            },
            address: { fullAddress: '10 rue Conservée', municipalityName: 'Laval' }
        },
        {
            description: 'questionnaire city fills a missing municipality',
            attributes: {
                _address: { fullAddress: '123 rue Principale' },
                city: 'Montréal'
            },
            address: { fullAddress: '123 rue Principale', municipalityName: 'Montréal' }
        },
        {
            description: 'region only',
            attributes: { region: 'QC' },
            address: { region: 'QC' }
        }
    ])('$description', ({ attributes, address }) => {
        const mapped = mapInterviewHomeAddress(attributes);

        expect(mapped._address).toEqual(address);
        expect(mapped).not.toHaveProperty('address');
        expect(mapped).not.toHaveProperty('city');
        expect(mapped).not.toHaveProperty('region');
        expect(mapped).not.toHaveProperty('apartmentNumber');
    });

    test.each([
        ['no address fields', { geography: { type: 'Point' } }],
        ['blank questionnaire address', { address: '  ', city: '', region: '' }]
    ])('should leave _address unset for %s', (_description, attributes) => {
        const mapped = mapInterviewHomeAddress(attributes);

        expect(mapped._address).toBeUndefined();
        expect(mapped).not.toHaveProperty('address');
        expect(mapped).not.toHaveProperty('city');
    });

    test('should keep geography and preData', () => {
        const mapped = mapInterviewHomeAddress({
            address: '123 rue Principale',
            geography: { type: 'Point' },
            preData: { Address: '10 rue Ancienne' }
        });

        expect(mapped.geography).toEqual({ type: 'Point' });
        expect(mapped.preData).toEqual({ Address: '10 rue Ancienne' });
    });

    test('should not mutate the original attributes', () => {
        const attributes = { address: '123 rue Principale', city: 'Montréal' };
        mapInterviewHomeAddress(attributes);
        expect(attributes).toEqual({ address: '123 rue Principale', city: 'Montréal' });
    });
});
