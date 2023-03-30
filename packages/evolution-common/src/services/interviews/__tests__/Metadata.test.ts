/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Metadata } from '../Metadata';

describe('Metadata type tests', () => {
    test('Basic Metadata object', () => {
        const metadata: Metadata = {
            _uuid: 'metadata1',
            startedAt: 1619208671000,
            device: 'Laptop',
            os: 'Windows',
            appVersion: '1.0.0',
        };

        expect(metadata._uuid).toBe('metadata1');
        expect(metadata.startedAt).toBe(1619208671000);
        expect(metadata.device).toBe('Laptop');
        expect(metadata.os).toBe('Windows');
        expect(metadata.appVersion).toBe('1.0.0');
    });
});
