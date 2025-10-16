/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewParadata, InterviewParadataAttributes } from '../InterviewParadata';
import { isOk, hasErrors } from '../../../../types/Result.type';

describe('InterviewParadata', () => {
    const validParams: InterviewParadataAttributes = {
        startedAt: 1625097600,
        updatedAt: 1625184000,
        completedAt: 1625270400,
        source: 'web',
        personsRandomSequence: ['uuid1', 'uuid2'],
        languages: [
            { language: 'en', startTimestamp: 1625097600, endTimestamp: 1625270400 }
        ],
        browsers: [
            {
                _ua: 'Mozilla/5.0...',
                browser: { name: 'Chrome', version: '91.0.4472.124' },
                os: { name: 'Windows', version: '10' },
                platform: { type: 'desktop' },
                startTimestamp: 1625097600,
                endTimestamp: 1625270400
            }
        ],
        sections: {
            _actions: [
                { section: 'home', action: 'start', ts: 1757531067 },
                { section: 'household', action: 'start', ts: 1757531095, iterationContext: ['1'] }
            ],
            'home': {
                _startedAt: 1625097600,
                _isCompleted: true
            },
            'household': {
                _startedAt: 1625097600,
                _isCompleted: true
            },
            'householdMembers': {
                _startedAt: 1625097600,
                _isCompleted: true,
                'person/uuid1': {
                    _startedAt: 1625097600,
                    _isCompleted: true
                },
                'person/uuid2': {
                    _startedAt: 1625097600,
                    _isCompleted: true
                }
            }
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
            const minimalParams = { startedAt: 1625097600 };
            const paradata = new InterviewParadata(minimalParams);
            expect(paradata).toBeInstanceOf(InterviewParadata);
            expect(paradata.startedAt).toBe(minimalParams.startedAt);
        });
    });

    describe('create', () => {
        it('should create an InterviewParadata instance with valid parameters', () => {
            const result = InterviewParadata.create(validParams);
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
            const result = InterviewParadata.create(invalidParams);
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

        it('should correctly handle sections attribute (legacy format)', () => {
            const paradata = new InterviewParadata(validParams);
            expect(Object.keys(paradata.sections || {})).toHaveLength(4); // _actions, home, household, householdMembers
            expect(paradata.sections?._actions).toBeDefined();
            expect(Array.isArray(paradata.sections?._actions)).toBe(true);
            expect(paradata.sections?.home).toBeDefined();
            expect((paradata.sections?.home as { _startedAt?: number, _isCompleted?: boolean })?._startedAt).toBe(1625097600);
            expect((paradata.sections?.home as { _startedAt?: number, _isCompleted?: boolean })?._isCompleted).toBe(true);
            expect(paradata.sections?.household).toBeDefined();
            expect((paradata.sections?.household as { _startedAt?: number, _isCompleted?: boolean })?._startedAt).toBe(1625097600);
            expect((paradata.sections?.household as { _startedAt?: number, _isCompleted?: boolean })?._isCompleted).toBe(true);
            expect(paradata.sections?.householdMembers).toBeDefined();
            expect((paradata.sections?.householdMembers as { _startedAt?: number, _isCompleted?: boolean })?._startedAt).toBe(1625097600);
            expect((paradata.sections?.householdMembers as { _startedAt?: number, _isCompleted?: boolean })?._isCompleted).toBe(true);
            const householdMembers = paradata.sections?.householdMembers as { [key: string]: { _startedAt?: number, _isCompleted?: boolean } };
            expect((householdMembers?.['person/uuid1'] as { _startedAt?: number, _isCompleted?: boolean })?._startedAt).toBe(1625097600);
            expect((householdMembers?.['person/uuid1'] as { _startedAt?: number, _isCompleted?: boolean })?._isCompleted).toBe(true);
            expect((householdMembers?.['person/uuid2'] as { _startedAt?: number, _isCompleted?: boolean })?._startedAt).toBe(1625097600);
            expect((householdMembers?.['person/uuid2'] as { _startedAt?: number, _isCompleted?: boolean })?._isCompleted).toBe(true);
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
