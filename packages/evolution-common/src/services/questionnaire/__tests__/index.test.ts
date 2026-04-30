/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { QuestionnaireFactory } from '../index';
import type { QuestionnaireConfiguration } from '../types';
import type { WidgetFactoryOptions } from '../sections/types';

const baseVisitedPlacesConfig: NonNullable<
    NonNullable<QuestionnaireConfiguration['tripDiary']>['sections']['visitedPlaces']
> = {
    type: 'visitedPlaces',
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60,
    tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

const baseSegmentsConfig: NonNullable<
    NonNullable<QuestionnaireConfiguration['tripDiary']>['sections']['segments']
> = {
    type: 'segments',
    enabled: true
};

const widgetFactoryOptions: WidgetFactoryOptions = {
    getFormattedDate: (date: string) => date,
    buttonActions: {
        validateButtonAction: () => undefined,
        validateButtonActionWithCompleteSection: () => undefined
    },
    iconMapper: { 'check-circle': 'check-circle' as any }
};

describe('QuestionnaireFactory', () => {
    describe('buildSectionsAndWidgets', () => {
        const defaultVisitedPlacesWidgetNames = [
            'activePersonTitle',
            'buttonSwitchPerson',
            'personVisitedPlacesTitle',
            'personVisitedPlaces',
            'visitedPlaceActivityCategory',
            'visitedPlaceActivity',
            'visitedPlaceAlreadyVisited',
            'visitedPlaceShortcut',
            'visitedPlaceNextPlaceCategory',
            'visitedPlaceName',
            'visitedPlaceGeography',
            'personVisitedPlacesMap',
            'buttonVisitedPlacesConfirmNextSection'
        ];
        const defaultSegmentWidgetNames = [
            'activePersonTitle',
            'buttonSwitchPerson',
            'personTripsTitle',
            'personTrips',
            'segmentIntro',
            'buttonSaveTrip',
            'segments',
            'segmentSameModeAsReverseTrip',
            'segmentModePre',
            'segmentMode',
            'segmentHasNextMode',
            'personVisitedPlacesMap',
            'buttonConfirmNextSection'
        ];

        test.each([
            {
                title: 'should return empty config when tripDiary is undefined',
                questionnaireConfig: {} as QuestionnaireConfiguration,
                expectedSectionNames: [] as string[],
                expectedWidgetNames: [] as string[]
            },
            {
                title: 'should return empty config when tripDiary has no sections',
                questionnaireConfig: { tripDiary: { sections: {} } } as QuestionnaireConfiguration,
                expectedSectionNames: [] as string[],
                expectedWidgetNames: [] as string[]
            },
            {
                title: 'should return empty config when visited places is configured but disabled',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            visitedPlaces: { ...baseVisitedPlacesConfig, enabled: false }
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: [] as string[],
                expectedWidgetNames: [] as string[]
            },
            {
                title: 'should return empty config when segments is configured but disabled',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            segments: { ...baseSegmentsConfig, enabled: false }
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: [] as string[],
                expectedWidgetNames: [] as string[]
            },
            {
                title: 'should return only visited places section and widgets',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            visitedPlaces: baseVisitedPlacesConfig
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: ['visitedPlaces'],
                expectedWidgetNames: defaultVisitedPlacesWidgetNames
            },
            {
                title: 'should return only segments section and widgets',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            segments: baseSegmentsConfig
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: ['segments'],
                expectedWidgetNames: defaultSegmentWidgetNames
            },
            {
                title: 'should return segments section and widgets with optional widgets',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            segments: {
                                ...baseSegmentsConfig,
                                askSegmentDriver: true
                            }
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: ['segments'],
                expectedWidgetNames: [...defaultSegmentWidgetNames, 'segmentDriver']
            },
            {
                title: 'should return both sections and merged widgets',
                questionnaireConfig: {
                    tripDiary: {
                        sections: {
                            visitedPlaces: baseVisitedPlacesConfig,
                            segments: baseSegmentsConfig
                        }
                    }
                } as QuestionnaireConfiguration,
                expectedSectionNames: ['visitedPlaces', 'segments'],
                expectedWidgetNames: Array.from(new Set([
                    ...defaultVisitedPlacesWidgetNames,
                    ...defaultSegmentWidgetNames
                ]))
            }
        ])('$title', ({ questionnaireConfig, expectedSectionNames, expectedWidgetNames }) => {
            const factory = new QuestionnaireFactory(questionnaireConfig, widgetFactoryOptions);
            const result = factory.buildSectionsAndWidgets();

            const sectionNames = Object.keys(result.surveySections);
            expectedSectionNames.forEach((sectionName) => expect(sectionNames).toContain(sectionName));
            expect(sectionNames).toHaveLength(expectedSectionNames.length);

            const widgetNames = Object.keys(result.widgetsConfig);
            expectedWidgetNames.forEach((widgetName) => expect(widgetNames).toContain(widgetName));
            expect(widgetNames).toHaveLength(expectedWidgetNames.length);
        });

        test('should return section configs with expected templates and navigation', () => {
            const factory = new QuestionnaireFactory(
                {
                    tripDiary: {
                        sections: {
                            visitedPlaces: baseVisitedPlacesConfig,
                            segments: baseSegmentsConfig
                        }
                    }
                },
                widgetFactoryOptions
            );

            const result = factory.buildSectionsAndWidgets();

            expect(result.surveySections.visitedPlaces.template).toBe('visitedPlaces');
            expect(result.surveySections.visitedPlaces.previousSection).toBe('tripsIntro');
            expect(result.surveySections.visitedPlaces.nextSection).toBe('segments');

            expect(result.surveySections.segments.template).toBe('tripsAndSegmentsWithMap');
            expect(result.surveySections.segments.previousSection).toBe('visitedPlaces');
            expect(result.surveySections.segments.nextSection).toBe('travelBehavior');
        });

    });
});
