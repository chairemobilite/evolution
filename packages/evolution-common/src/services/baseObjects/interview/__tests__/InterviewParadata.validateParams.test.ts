/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewParadata } from '../InterviewParadata';

describe('InterviewParadata - InterviewParadata.validateParams', () => {
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
            engine: { name: 'Blink', version: '93.0' },
            os: { name: 'Windows', version: '10', versionName: 'Windows 10' },
            platform: { type: 'desktop', vendor: 'Microsoft', model: 'PC' },
            startTimestamp: 1632929461,
            endTimestamp: 1632930461
        }],
        sections: {
            home: [{
                startTimestamp: 1632929461,
                endTimestamp: 1632930461,
                widgets: {
                    widgetShortname: [{ startTimestamp: 1632929461, endTimestamp: 1632930461 }]
                }
            }]
        }
    };

    it('should validate valid params', () => {
        const errors = InterviewParadata.validateParams(validParams);
        expect(errors).toHaveLength(0);
    });

    it ('should accept empty params', () => {
        const params = {};
        const errors = InterviewParadata.validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it('should validate startedAt', () => {
        const params = { ...validParams, startedAt: 'not-a-number' };
        const errors = InterviewParadata.validateParams(params);
        expect(errors.some((e) => e.message.includes('startedAt'))).toBe(true);
    });

    it('should validate updatedAt', () => {
        const params = { ...validParams, updatedAt: 'not-a-number' };
        const errors = InterviewParadata.validateParams(params);
        expect(errors.some((e) => e.message.includes('updatedAt'))).toBe(true);
    });

    it('should validate completedAt', () => {
        const params = { ...validParams, completedAt: 'not-a-number' };
        const errors = InterviewParadata.validateParams(params);
        expect(errors.some((e) => e.message.includes('completedAt'))).toBe(true);
    });

    it('should validate source', () => {
        const params = { ...validParams, source: 123 };
        const errors = InterviewParadata.validateParams(params);
        expect(errors.some((e) => e.message.includes('source'))).toBe(true);
    });

    it('should validate personsRandomSequence', () => {
        const params = { ...validParams, personsRandomSequence: 'not-an-array' };
        const errors = InterviewParadata.validateParams(params);
        expect(errors.some((e) => e.message.includes('personsRandomSequence'))).toBe(true);
    });

    it('should validate with empty sections array', () => {
        const params = {
            ...validParams,
            sections: {}
        };
        const errors = InterviewParadata.validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it('should validate with empty languages array', () => {
        const params = {
            ...validParams,
            languages: []
        };
        const errors = InterviewParadata.validateParams(params);
        expect(errors).toHaveLength(0);
    });

    describe('Languages validation', () => {

        it('should make sure languages is an array', () => {
            const params = { ...validParams, languages: 'not-an-array' };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('languages'))).toBe(true);
        });

        it('should validate language field', () => {
            const params = { ...validParams, languages: [{ ...validParams.languages[0], language: 123 }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('languages.[0].language'))).toBe(true);
        });

        it('should validate startTimestamp field', () => {
            const params = { ...validParams, languages: [{ ...validParams.languages[0], startTimestamp: 'not-a-number' }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('languages.[0].startTimestamp'))).toBe(true);
        });

        it('should validate endTimestamp field', () => {
            const params = { ...validParams, languages: [{ ...validParams.languages[0], endTimestamp: 'not-a-number' }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('languages.[0].endTimestamp'))).toBe(true);
        });
    });

    describe('Browsers validation', () => {

        it('should make sure browsers is an array', () => {
            const params = { ...validParams, browsers: 'not-an-array' };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers'))).toBe(true);
        });

        it('should validate ua field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], ua: 123 }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].ua'))).toBe(true);
        });

        it('should validate browser name field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], browser: { ...validParams.browsers[0].browser, name: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].browser.name'))).toBe(true);
        });

        it('should validate browser version field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], browser: { ...validParams.browsers[0].browser, version: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].browser.version'))).toBe(true);
        });

        it('should validate engine name field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], engine: { ...validParams.browsers[0].engine, name: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].engine.name'))).toBe(true);
        });

        it('should validate engine version field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], engine: { ...validParams.browsers[0].engine, version: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].engine.version'))).toBe(true);
        });

        it('should validate os name field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], os: { ...validParams.browsers[0].os, name: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].os.name'))).toBe(true);
        });

        it('should validate os version field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], os: { ...validParams.browsers[0].os, version: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].os.version'))).toBe(true);
        });

        it('should validate os versionName field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], os: { ...validParams.browsers[0].os, versionName: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].os.versionName'))).toBe(true);
        });

        it('should validate platform type field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], platform: { ...validParams.browsers[0].platform, type: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].platform.type'))).toBe(true);
        });

        it('should validate platform vendor field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], platform: { ...validParams.browsers[0].platform, vendor: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].platform.vendor'))).toBe(true);
        });

        it('should validate platform model field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], platform: { ...validParams.browsers[0].platform, model: 123 } }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].platform.model'))).toBe(true);
        });

        it('should validate startTimestamp field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], startTimestamp: 'not-a-number' }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].startTimestamp'))).toBe(true);
        });

        it('should validate endTimestamp field', () => {
            const params = { ...validParams, browsers: [{ ...validParams.browsers[0], endTimestamp: 'not-a-number' }] };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('browsers.[0].endTimestamp'))).toBe(true);
        });
    });

    describe('Sections validation', () => {

        it('should make sure sections content is an array', () => {
            const params = { ...validParams, sections: { home: 'not-an-array' } };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home'))).toBe(true);
        });

        it('should validate section startTimestamp', () => {
            const params = {
                ...validParams, sections: {
                    home: [{ ...validParams.sections.home[0], startTimestamp: 'not-a-number' }]
                }
            };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home.[0].startTimestamp'))).toBe(true);
        });

        it('should validate section endTimestamp', () => {
            const params = {
                ...validParams, sections: {
                    home: [{ ...validParams.sections.home[0], endTimestamp: 'not-a-number' }]
                }
            };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home.[0].endTimestamp'))).toBe(true);
        });

        it('should make sure widgets is an array', () => {
            const params = { ...validParams, sections: { home: [{ ...validParams.sections.home[0], widgets: 'not-an-array' }] } };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home.[0].widgets'))).toBe(true);
        });

        it('should validate widget startTimestamp', () => {
            const params = {
                ...validParams, sections: {
                    home: [{
                        ...validParams.sections.home[0],
                        widgets: {
                            widgetShortname: [{ ...validParams.sections.home[0].widgets.widgetShortname[0], startTimestamp: 'not-a-number' }]
                        }
                    }]
                }
            };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home.[0].widgets.widgetShortname.[0].startTimestamp'))).toBe(true);
        });

        it('should validate widget endTimestamp', () => {
            const params = {
                ...validParams, sections: {
                    home: [{
                        ...validParams.sections.home[0],
                        widgets: {
                            widgetShortname: [{ ...validParams.sections.home[0].widgets.widgetShortname[0], endTimestamp: 'not-a-number' }]
                        }
                    }]
                }
            };
            const errors = InterviewParadata.validateParams(params);
            expect(errors.some((e) => e.message.includes('sections.home.[0].widgets.widgetShortname.[0].endTimestamp'))).toBe(true);
        });
    });

});
