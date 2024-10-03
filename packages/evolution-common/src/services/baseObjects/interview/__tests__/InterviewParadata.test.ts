/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewParadata, InterviewParadataAttributes } from '../InterviewParadata';
import { isOk, hasErrors } from '../../../../types/Result.type';
import { create } from '../InterviewParadataUnserializer';

describe('InterviewParadata', () => {
    const validParams: InterviewParadataAttributes = {
        startedAt: 1625097600000,
        updatedAt: 1625184000000,
        completedAt: 1625270400000,
        source: 'web',
        personsRandomSequence: ['uuid1', 'uuid2'],
        languages: [
            { language: 'en', startTimestamp: 1625097600000, endTimestamp: 1625270400000 }
        ],
        browsers: [
            {
                _ua: 'Mozilla/5.0...',
                browser: { name: 'Chrome', version: '91.0.4472.124' },
                os: { name: 'Windows', version: '10' },
                platform: { type: 'desktop' },
                startTimestamp: 1625097600000,
                endTimestamp: 1625270400000
            }
        ],
        sections: {
            'home': [
                {
                    startTimestamp: 1625097600000,
                    endTimestamp: 1625184000000,
                    widgets: {
                        'widgetShortname': [
                            { startTimestamp: 1625097600000, endTimestamp: 1625140800000 }
                        ]
                    }
                }
            ]
        }
    };

    describe('constructor', () => {
        it('should create an InterviewParadata instance with valid parameters', () => {
            const paradata = new InterviewParadata(validParams);
            expect(paradata).toBeInstanceOf(InterviewParadata);
            expect(paradata.startedAt).toBe(validParams.startedAt);
            expect(paradata.source).toBe(validParams.source);
        });

        it('should create an instance with minimal valid parameters', () => {
            const minimalParams = { startedAt: 1625097600000 };
            const paradata = new InterviewParadata(minimalParams);
            expect(paradata).toBeInstanceOf(InterviewParadata);
            expect(paradata.startedAt).toBe(minimalParams.startedAt);
        });
    });

    describe('create', () => {
        it('should create an InterviewParadata instance with valid parameters', () => {
            const result = create(validParams);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toBeInstanceOf(InterviewParadata);
                expect(result.result.startedAt).toBe(validParams.startedAt);
            }
        });

        it('should return errors for invalid parameters', () => {
            const invalidParams = {
                ...validParams,
                startedAt: 'invalid' // should be a number
            };
            const result = create(invalidParams);
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors.length).toBeGreaterThan(0);
                expect(result.errors[0].message).toContain('startedAt');
            }
        });
    });

    describe('attribute handling', () => {
        it('should correctly handle languages attribute', () => {
            const paradata = new InterviewParadata(validParams);
            expect(paradata.languages).toHaveLength(1);
            expect(paradata.languages?.[0].language).toBe('en');
        });

        it('should correctly handle browsers attribute', () => {
            const paradata = new InterviewParadata(validParams);
            expect(paradata.browsers).toHaveLength(1);
            expect(paradata.browsers?.[0].browser?.name).toBe('Chrome');
        });

        it('should correctly handle sections attribute', () => {
            const paradata = new InterviewParadata(validParams);
            expect(Object.keys(paradata.sections || {})).toHaveLength(1);
            expect(paradata.sections?.home).toBeDefined();
            expect(paradata.sections?.home[0].widgets.widgetShortname).toHaveLength(1);
        });

        it('should handle empty params', () => {
            const emptyParams = {};
            const paradata = new InterviewParadata(emptyParams);
            expect(paradata.startedAt).toBeUndefined();
            expect(paradata.updatedAt).toBeUndefined();
            expect(paradata.completedAt).toBeUndefined();
            expect(paradata.source).toBeUndefined();
            expect(paradata.personsRandomSequence).toBeUndefined();
            expect(paradata.languages).toEqual([]);
            expect(paradata.browsers).toEqual([]);
            expect(paradata.sections).toEqual({});
        });
    });

    describe('Edge cases', () => {
        it('should handle empty section data', () => {
            const emptyParams = {
                ...validParams,
                sections: {}
            };
            const paradata = new InterviewParadata(emptyParams);
            expect(paradata.sections).toEqual({});
        });
    });
});
