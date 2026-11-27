/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import _cloneDeep from 'lodash/cloneDeep';
import { getAndValidateSurveySections, SectionConfigWithDefaults, SurveySectionsConfig } from '../SectionConfig';

describe('getAndValidateSurveySections', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should set default values for minimal section config', () => {
        const minimalSection: SurveySectionsConfig = {
            section1: {
                previousSection: null,
                nextSection: null,
                widgets: []
            }
        };

        const result = getAndValidateSurveySections(minimalSection);

        expect(result.section1).toEqual({
            sectionName: 'section1',
            type: 'section',
            previousSection: null,
            nextSection: null,
            widgets: [],
            navMenu: { type: 'inNav', menuName: '' }
        });
    });

    test('should set default values when title is provided', () => {
        const sectionWithTitle: SurveySectionsConfig = {
            section1: {
                title: { en: 'Test Section', fr: 'Section de test' },
                previousSection: null,
                nextSection: null,
                widgets: ['widget1']
            }
        };

        const result = getAndValidateSurveySections(sectionWithTitle);

        expect(result.section1).toEqual({
            sectionName: 'section1',
            type: 'section',
            title: { en: 'Test Section', fr: 'Section de test' },
            previousSection: null,
            nextSection: null,
            widgets: ['widget1'],
            navMenu: {
                type: 'inNav',
                menuName: { en: 'Test Section', fr: 'Section de test' }
            }
        });
    });

    test('should preserve custom navMenu when provided', () => {
        const sectionWithCustomNavMenu: SurveySectionsConfig = {
            mainSection: {
                title: { en: 'Main Section', fr: 'Section principale' },
                previousSection: null,
                nextSection: 'section1',
                widgets: ['widget1']
            },
            section1: {
                title: { en: 'Test Section', fr: 'Section de test' },
                previousSection: 'mainSection',
                nextSection: null,
                widgets: ['widget1'],
                navMenu: {
                    type: 'hidden',
                    parentSection: 'mainSection'
                }
            }
        };

        const result = getAndValidateSurveySections(sectionWithCustomNavMenu);

        expect(result.section1.navMenu).toEqual({
            type: 'hidden',
            parentSection: 'mainSection'
        });
    });

    test('should handle multiple sections correctly', () => {
        const multipleSections: SurveySectionsConfig = {
            section1: {
                title: { en: 'Section 1', fr: 'Section 1' },
                previousSection: null,
                nextSection: 'section2',
                widgets: ['widget1']
            },
            section2: {
                title: { en: 'Section 2', fr: 'Section 2' },
                previousSection: 'section1',
                nextSection: null,
                widgets: ['widget2'],
                navMenu: {
                    type: 'inNav',
                    menuName: { en: 'Custom Menu Name', fr: 'Nom de menu personnalisé' }
                }
            }
        };

        const result = getAndValidateSurveySections(multipleSections);

        expect(Object.keys(result)).toHaveLength(2);
        expect(result.section1.navMenu).toEqual({
            type: 'inNav',
            menuName: { en: 'Section 1', fr: 'Section 1' }
        });
        expect(result.section2.navMenu).toEqual({
            type: 'inNav',
            menuName: { en: 'Custom Menu Name', fr: 'Nom de menu personnalisé' }
        });
    });

    test('should preserve all properties in a complete section config', () => {
        const mockPreload = jest.fn();
        const mockConditionalFn = () => true;
        const completeSection: SurveySectionsConfig = {
            intro: {
                title: { en: 'Introduction', fr: 'Introduction' },
                previousSection: null,
                nextSection: 'section1',
                widgets: ['widget1']
            },
            section1: {
                title: { en: 'Complete Section', fr: 'Section complète' },
                previousSection: 'intro',
                nextSection: 'outro',
                widgets: ['widget1', 'widget2'],
                navMenu: {
                    type: 'hidden',
                    parentSection: 'intro'
                },
                enableConditional: mockConditionalFn,
                completionConditional: true,
                template: 'tripsAndSegmentsWithMap',
                preload: mockPreload,
                customStyle: { background: 'red' },
                isSectionVisible: jest.fn(),
                isSectionCompleted: jest.fn()
            },
            outro: {
                title: { en: 'Outro', fr: 'Conclusion' },
                previousSection: 'section1',
                nextSection: null,
                widgets: ['widget3']
            }
        };

        const result = getAndValidateSurveySections(completeSection);

        expect(result.section1).toEqual({
            sectionName: 'section1',
            ...completeSection.section1,
            type: 'section'
        });
    });

    test('should set default nav menu hidden and repeated block section when in a repeated block', () => {
        const sectionsWithoutNav: SurveySectionsConfig = {
            section1: {
                title: { en: 'Test Section', fr: 'Section de test' },
                previousSection: null,
                nextSection: 'end',
                widgets: ['widget1'],
                repeatedBlock: {
                    iterationRule: { type: 'builtin', path: 'interviewablePersons' },
                    activeSurveyObjectPath: '_activePersonId',
                    sections: ['section3'],
                }
            },
            section3: {
                title: { en: 'Test Section 3', fr: 'Section de test 3' },
                previousSection: null,
                widgets: ['widget2'],
                nextSection: 'section1'
            },
            end: {
                title: { en: 'Test Section 3', fr: 'Section de test 3' },
                previousSection: 'section1',
                nextSection: null,
                widgets: []
            }
        };

        const result = getAndValidateSurveySections(sectionsWithoutNav);

        expect(result).toEqual(expect.objectContaining({
            section3: expect.objectContaining({
                sectionName: 'section3',
                type: 'section',
                navMenu: {
                    type: 'hidden',
                    parentSection: 'section1'
                },
                repeatedBlockSection: 'section1'
            }),
            section1: expect.objectContaining({
                sectionName: 'section1',
                type: 'repeatedBlock',
                navMenu: {
                    type: 'inNav',
                    menuName: { en: 'Test Section', fr: 'Section de test' }
                },
                repeatedBlock: sectionsWithoutNav.section1.repeatedBlock
            })
        }));
    });

    test('should move deprecated selectionSectionId widgets to repeated block', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const sections: SurveySectionsConfig = {
            section1: {
                previousSection: null,
                nextSection: 'end',
                widgets: [],
                repeatedBlock: {
                    iterationRule: { type: 'builtin', path: 'interviewablePersons' },
                    activeSurveyObjectPath: '_activePersonId',
                    selectionSectionId: 'objectSelection',
                    sections: ['objectSelection', 'section2']
                }
            },
            objectSelection: {
                previousSection: 'section1',
                nextSection: 'section2',
                widgets: ['selectionWidget']
            },
            section2: {
                previousSection: 'objectSelection',
                nextSection: 'section1',
                widgets: ['iterationWidget']
            },
            end: {
                previousSection: 'section1',
                nextSection: null,
                widgets: []
            }
        };

        const result = getAndValidateSurveySections(_cloneDeep(sections));
        expect(result.section1).toEqual({
            type: 'repeatedBlock',
            sectionName: 'section1',
            previousSection: null,
            nextSection: 'end',
            navMenu: expect.any(Object),
            widgets: sections.objectSelection.widgets,
            repeatedBlock: {
                iterationRule: { type: 'builtin', path: 'interviewablePersons' },
                activeSurveyObjectPath: '_activePersonId',
                sections: ['section2']
            }
        });
        expect(result.section2).toEqual({
            type: 'section',
            navMenu: expect.any(Object),
            previousSection: 'section1',
            nextSection: 'section1',
            widgets: ['iterationWidget'],
            repeatedBlockSection: 'section1',
            sectionName: 'section2'
        });
        expect(warnSpy).toHaveBeenCalledWith('Section configuration: \'selectionSectionId\' is deprecated for section section1. Move the widgets to the repeated block section itself.')
        warnSpy.mockRestore();
    });

    test.each([
        { description: 'undefined selection section', repeatedBlockSectionExtra: { selectionSectionId: 'missingSection', sections: ['section2'] } },
        { description: 'repeated block already has widgets', repeatedBlockWidgets: ['widget'], additionalSectionConfig: { objectSelection: { previousSection: 'section1', nextSection: 'section2', widgets: ['widget2', 'widget3'] } } },
    ])('should ignore deprecated selectionSectionId in case $description', ({ repeatedBlockSectionExtra = {}, additionalSectionConfig, repeatedBlockWidgets = [] }) => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const sections: SurveySectionsConfig = {
            section1: {
                previousSection: null,
                nextSection: 'end',
                widgets: repeatedBlockWidgets,
                repeatedBlock: Object.assign({
                    iterationRule: { type: 'builtin' as const, path: 'interviewablePersons' as const },
                    activeSurveyObjectPath: '_activePersonId',
                    selectionSectionId: 'objectSelection',
                    sections: ['objectSelection', 'section2']
                }, repeatedBlockSectionExtra ?? {})
            },
            ...additionalSectionConfig ?? {},
            section2: {
                previousSection: additionalSectionConfig !== undefined ? 'objectSelection' : 'section1',
                nextSection: 'section1',
                widgets: ['iterationWidget']
            },
            end: {
                previousSection: 'section1',
                nextSection: null,
                widgets: []
            }
        };

        const result = getAndValidateSurveySections(_cloneDeep(sections));
        expect(result.section1).toEqual({
            type: 'repeatedBlock',
            sectionName: 'section1',
            navMenu: expect.any(Object),
            ...sections['section1'],
            repeatedBlock: {
                ...sections['section1'].repeatedBlock,
                selectionSectionId: undefined
            }
        });
        expect(result.section2).toEqual({
            type: 'section',
            navMenu: expect.any(Object),
            sectionName: 'section2',
            repeatedBlockSection: 'section1',
            ...sections['section2']
        });
        expect(result.section1.type).toBe('repeatedBlock');
        expect((result.section1 as SectionConfigWithDefaults).repeatedBlockSection).toBeUndefined();
        expect((result.section2 as SectionConfigWithDefaults).repeatedBlockSection).toBe('section1');
        expect(warnSpy).toHaveBeenCalledWith('Section configuration: \'selectionSectionId\' is deprecated for section section1. Move the widgets to the repeated block section itself.')
        warnSpy.mockRestore();
    });

    test('should preserve nav menu when in a repeated block', () => {
        const sectionWithCustomNavMenu: SurveySectionsConfig = {
            section1: {
                title: { en: 'Test Section', fr: 'Section de test' },
                previousSection: null,
                nextSection: 'end',
                widgets: ['widget1'],
                repeatedBlock: {
                    iterationRule: { type: 'builtin', path: 'interviewablePersons' },
                    activeSurveyObjectPath: '_activePersonId',
                    sections: ['section3'],
                }
            },
            section3: {
                title: { en: 'Test Section 3', fr: 'Section de test 3' },
                previousSection: null,
                nextSection: 'section1',
                widgets: ['widget2'],
                navMenu: { type: 'inNav', menuName: 'Test nav menu' }
            },
            end: {
                title: { en: 'Test Section 3', fr: 'Section de test 3' },
                previousSection: 'section1',
                nextSection: null,
                widgets: []
            }
        };

        const result = getAndValidateSurveySections(sectionWithCustomNavMenu);

        expect(result.section3.navMenu).toEqual({ type: 'inNav', menuName: 'Test nav menu' });
    });

    describe('should throw errors for undefined sections/errors in configuration', () => {
        each([
            ['nextSection', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: 'section2',
                    widgets: ['widget1']
                }
            },
            'Section "section2" is referenced in "nextSection" of section "section1", but it is not defined in the sections config.'],
            ['previousSection', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: 'section2',
                    nextSection: null,
                    widgets: ['widget1']
                }
            },
            'Section "section2" is referenced in "previousSection" of section "section1", but it is not defined in the sections config.'],
            ['repeatedBlock, missing section', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: 'section3',
                    widgets: ['widget1'],
                    repeatedBlock: {
                        iterationRule: { type: 'builtin', path: 'interviewablePersons' },
                        activeSurveyObjectPath: '_activePersonId',
                        sections: ['section2', 'section3'],
                    }
                },
                section3: {
                    title: { en: 'Test Section 3', fr: 'Section de test 3' },
                    previousSection: null,
                    nextSection: 'section1'
                }
            },
            'Section "section2" is referenced in "repeatedBlock" of section "section1", but it is not defined in the sections config.'],
            ['navMenu parent does not exists', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: null,
                    widgets: ['widget1'],
                    navMenu: { type: 'hidden', parentSection: 'mainSection' }
                }
            },
            'Parent section "mainSection" is referenced in "navMenu" of section "section1", but it is not defined in the sections config.'],
            ['navMenu parent not in nav', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: 'section3',
                    widgets: ['widget1'],
                    navMenu: { type: 'hidden', parentSection: 'section3' }
                },
                section3: {
                    title: { en: 'Test Section 3', fr: 'Section de test 3' },
                    previousSection: 'section1',
                    nextSection: null,
                    navMenu: { type: 'hidden', parentSection: 'section3' }
                }
            },
            'Parent section "section3" referenced in "navMenu" of section "section1" is not visible in the navigation menu.'],
            ['No first section', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: 'section2',
                    nextSection: 'section2',
                    widgets: ['widget1']
                },
                section2: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: 'section1',
                    nextSection: null,
                    widgets: ['widget1']
                }
            },
            'No first section defined. Make sure at least one section has "previousSection" set to null.'],
            ['No last section', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: 'section2',
                    widgets: ['widget1']
                },
                section2: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: 'section1',
                    nextSection: 'section1',
                    widgets: ['widget1']
                }
            },
            'No last section defined. Make sure at least one section has "nextSection" set to null.'],
            ['No next section for repeated block', {
                section1: {
                    title: { en: 'Test Section', fr: 'Section de test' },
                    previousSection: null,
                    nextSection: null,
                    widgets: ['widget1'],
                    repeatedBlock: {
                        iterationRule: { type: 'builtin' as const, path: 'interviewablePersons' as const },
                        activeSurveyObjectPath: '_activePersonId',
                        sections: ['section3'],
                    }
                },
                section3: {
                    title: { en: 'Test Section 3', fr: 'Section de test 3' },
                    previousSection: null,
                    nextSection: 'section1',
                    widgets: []
                }
            },
            'Section "section1" cannot have a nextSection set to null when it is a repeated block.']
        ]).test('%s', (_location, sections, expectedError) => {
            expect(() => getAndValidateSurveySections(sections)).toThrow(expectedError);
        });
    });

});
