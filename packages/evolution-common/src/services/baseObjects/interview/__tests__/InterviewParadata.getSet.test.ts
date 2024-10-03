/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewParadata } from '../InterviewParadata';
import { Result, isOk, unwrap } from '../../../../types/Result.type';
import { create } from '../InterviewParadataUnserializer';
describe('InterviewParadata - Getters and Setters', () => {
    let paradata: InterviewParadata;

    beforeEach(() => {
        const validParams = {
            startedAt: 1632929461,
            updatedAt: 1632929561,
            completedAt: 1632930461,
            source: 'web',
            personsRandomSequence: ['uuid1', 'uuid2'],
            languages: [{ language: 'en', startTimestamp: 1632929461, endTimestamp: 1632930461 }],
            browsers: [{
                ua: 'Mozilla/5.0',
                browser: { name: 'Chrome', version: '93.0' },
                startTimestamp: 1632929461,
                endTimestamp: 1632930461
            }],
            sections: {
                'section1': [{ startTimestamp: 1632929461, endTimestamp: 1632930461, widgets: {} }]
            }
        };
        const result = create(validParams) as Result<InterviewParadata>;
        if (isOk(result)) {
            paradata = unwrap(result) as InterviewParadata;
        } else {
            throw new Error('Failed to create interview paradata');
        }
    });

    it('should get and set startedAt', () => {
        expect(paradata.startedAt).toBe(1632929461);
        paradata.startedAt = 1632929462;
        expect(paradata.startedAt).toBe(1632929462);
        paradata.startedAt = undefined;
        expect(paradata.startedAt).toBeUndefined();
    });

    it('should get and set updatedAt', () => {
        expect(paradata.updatedAt).toBe(1632929561);
        paradata.updatedAt = 1632929562;
        expect(paradata.updatedAt).toBe(1632929562);
        paradata.updatedAt = undefined;
        expect(paradata.updatedAt).toBeUndefined();
    });

    it('should get and set completedAt', () => {
        expect(paradata.completedAt).toBe(1632930461);
        paradata.completedAt = 1632930462;
        expect(paradata.completedAt).toBe(1632930462);
        paradata.completedAt = undefined;
        expect(paradata.completedAt).toBeUndefined();
    });

    it('should get and set source', () => {
        expect(paradata.source).toBe('web');
        paradata.source = 'mobile';
        expect(paradata.source).toBe('mobile');
        paradata.source = undefined;
        expect(paradata.source).toBeUndefined();
    });

    it('should get and set personsRandomSequence', () => {
        expect(paradata.personsRandomSequence).toEqual(['uuid1', 'uuid2']);
        paradata.personsRandomSequence = ['uuid3', 'uuid4'];
        expect(paradata.personsRandomSequence).toEqual(['uuid3', 'uuid4']);
        paradata.personsRandomSequence = undefined;
        expect(paradata.personsRandomSequence).toBeUndefined();
    });

    it('should get and set languages', () => {
        expect(paradata.languages).toHaveLength(1);
        expect(paradata.languages?.[0].language).toBe('en');

        const newLanguages = [{ language: 'fr', startTimestamp: 1632930462, endTimestamp: 1632931462 }];
        paradata.languages = newLanguages;
        expect(paradata.languages).toEqual(newLanguages);

        paradata.languages = undefined;
        expect(paradata.languages).toEqual([]);
    });

    it('should get and set browsers', () => {
        expect(paradata.browsers).toHaveLength(1);
        expect(paradata.browsers?.[0].browser?.name).toBe('Chrome');

        const newBrowsers = [{
            ua: 'Mozilla/5.0',
            browser: { name: 'Firefox', version: '92.0' },
            startTimestamp: 1632930462,
            endTimestamp: 1632931462
        }];
        paradata.browsers = newBrowsers;
        expect(paradata.browsers).toEqual(newBrowsers);

        paradata.browsers = undefined;
        expect(paradata.browsers).toEqual([]);
    });

    it('should get and set sections', () => {
        expect(paradata.sections).toHaveProperty('section1');
        expect(paradata.sections?.section1).toHaveLength(1);

        const newSections = {
            'section2': [{ startTimestamp: 1632930462, endTimestamp: 1632931462, widgets: {} }]
        };
        paradata.sections = newSections;
        expect(paradata.sections).toEqual(newSections);

        paradata.sections = undefined;
        expect(paradata.sections).toEqual({});
    });

});
