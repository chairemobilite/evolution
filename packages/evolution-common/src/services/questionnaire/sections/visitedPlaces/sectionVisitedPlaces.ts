/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isEmpty from 'lodash/isEmpty';
import { TFunction } from 'i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { addGroupedObjects } from '../../../../utils/helpers';
import * as odHelpers from '../../../odSurvey/helpers';
import type {
    Journey,
    Person,
    SectionConfig,
    UserRuntimeInterviewAttributes,
    VisitedPlacesSectionConfiguration,
    WidgetConfig
} from '../../types';
import type { SectionConfigFactory, WidgetFactoryOptions } from '../types';
import { getPersonVisitedPlacesTitleWidgetConfig } from './widgetPersonVisitedPlacesTitle';
import { SwitchPersonWidgetsFactory } from '../common/widgetsSwitchPerson';
import { getPersonVisitedPlacesMapConfig } from '../common/widgetPersonVisitedPlacesMap';
import { PersonVisitedPlacesGroupConfigFactory } from './groupPersonVisitedPlaces';
import { getButtonConfirmGotoNextSectionWidgetConfig } from './buttonConfirmGotoNextSection';
import { tripDiarySectionVisibleConditional } from '../tripDiary/tripDiaryHelpers';
import { Activity, ActivityCategory } from '../../../odSurvey/types';

export class VisitedPlacesSectionFactory implements SectionConfigFactory {
    private _sectionConfig: SectionConfig | undefined = undefined;
    private _widgets: Record<string, WidgetConfig> | undefined = undefined;

    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
        this.prepareWidgetsAndSection();
    }

    // Add the initial visited place(s) when entering the section for the first
    // time, based on the departure place information of the journey
    private addInitialVisitedPlaces = (
        interview: UserRuntimeInterviewAttributes,
        person: Person,
        journey: Journey
    ): Record<string, unknown> | undefined => {
        // Add home as first visited place and add a second one
        if (journey.departurePlaceIsHome === 'yes') {
            // Add 2 places: home and the next one
            const { valuesByPath, newObjects } = addGroupedObjects(
                interview,
                2,
                1,
                `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces`,
                [
                    {
                        activity: 'home',
                        activityCategory: 'home',
                        nextPlaceCategory: 'visitedAnotherPlace'
                    },
                    {}
                ]
            );
            // Select the second place as active place
            valuesByPath['response._activeVisitedPlaceId'] = newObjects[1]._uuid;
            return valuesByPath;
        }

        // Add the first visited place based on the departurePlaceOther
        let firstActivity: Activity | null = null;
        let firstActivityCategory: ActivityCategory | null = null;
        // FIXME The departurePlaceOther is not typed (the question is not in
        // Evolution either), the mapping here should be improved when the data
        // is better typed, or may come from config as seen fit.
        if (journey.departurePlaceOther) {
            if (journey.departurePlaceOther === 'otherParentHome') {
                firstActivity = 'otherParentHome';
                firstActivityCategory = 'otherParentHome';
            } else if (journey.departurePlaceOther === 'restaurant') {
                firstActivity = 'restaurant';
                firstActivityCategory = 'shoppingServiceRestaurant';
            } else if (journey.departurePlaceOther === 'secondaryHome') {
                firstActivity = 'secondaryHome';
                firstActivityCategory = 'leisure';
            } else if (journey.departurePlaceOther === 'sleptAtFriends') {
                firstActivity = 'visiting';
                firstActivityCategory = 'leisure';
            } else if (journey.departurePlaceOther === 'hotelForWork') {
                firstActivity = 'workNotUsual';
                firstActivityCategory = 'work';
            } else if (journey.departurePlaceOther === 'hotelForVacation') {
                firstActivity = 'leisureTourism';
                firstActivityCategory = 'leisure';
            } else if (journey.departurePlaceOther === 'studying') {
                firstActivity = null; // must be specified in the visited places section
                firstActivityCategory = 'school';
            } else if (journey.departurePlaceOther === 'workedOvernight') {
                firstActivity = null; // must be specified in the visited places section
                firstActivityCategory = 'work';
            }
            // Else fallback to null, leaving the activity and category to be specified by the respondent
        }

        // Add the new visited place at the beginning of the list (which is empty anyway)
        const { valuesByPath, newObjects } = addGroupedObjects(
            interview,
            1,
            1,
            `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces`,
            [
                {
                    activity: firstActivity,
                    activityCategory: firstActivityCategory
                }
            ]
        );
        // Select the new place as active place
        valuesByPath['response._activeVisitedPlaceId'] = newObjects[0]._uuid;
        return valuesByPath;
    };

    private getVisitedPlacesSectionConfig = (): SectionConfig => {
        return {
            previousSection: 'tripsIntro',
            nextSection: 'segments',
            isSectionVisible: tripDiarySectionVisibleConditional,
            isSectionCompleted: (interview, iterationContext) => {
                const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
                // Section is complete when there are no incomplete visited places
                const person = odHelpers.getPerson({
                    interview,
                    personId: personId
                });
                const journey = person !== null ? odHelpers.getActiveJourney({ interview, person }) : null;
                if (person === null || journey === null) {
                    return false;
                }
                const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey });
                return (
                    visitedPlaces.length > 0 &&
                    odHelpers.getFirstIncompleteVisitedPlace({ interview, person, journey }) === null
                );
            },
            onSectionEntry: (interview, iterationContext) => {
                const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
                const person = personId === undefined ? null : odHelpers.getPerson({ interview, personId });
                if (person === null) {
                    // Log error, that is unexpected
                    console.error(
                        `visited places section.onSectionEntry: No person found for iteration context: ${JSON.stringify(iterationContext)}`
                    );
                    return undefined;
                }
                const journey = odHelpers.getActiveJourney({ interview, person });
                if (journey === null) {
                    // This shouldn't happen, but log anyway, just in case
                    console.error('visited places section.onSectionEntry: No journey found for person:', person._uuid);
                    return undefined;
                }

                const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey });
                if (visitedPlaces.length === 0) {
                    return this.addInitialVisitedPlaces(interview, person, journey);
                }
                // Just select the next visited place ID
                const incompleteVisitedPlace = odHelpers.getFirstIncompleteVisitedPlace({
                    interview,
                    journey,
                    person
                });
                return {
                    'response._activeVisitedPlaceId': incompleteVisitedPlace ? incompleteVisitedPlace._uuid : undefined
                };
            },

            // Section specific configuration
            template: 'visitedPlaces',
            title: (t: TFunction) => t('visitedPlaces:VisitedPlacesTitle'),
            // Main section's widgets, this is not configurable (for now)
            widgets: [
                'activePersonTitle',
                'buttonSwitchPerson',
                'personVisitedPlacesTitle',
                'personVisitedPlaces',
                'personVisitedPlacesMap',
                'buttonVisitedPlacesConfirmNextSection'
            ]
        };
    };

    private prepareWidgetsAndSection() {
        if (this.sectionConfig.enabled !== true) {
            throw new Error('Visited places section configuration requested but the section is not enabled');
        }
        this._sectionConfig = this.getVisitedPlacesSectionConfig();
        const switchPersonsWidget = new SwitchPersonWidgetsFactory(this.options);
        const personVisitedPlacesGroup = new PersonVisitedPlacesGroupConfigFactory(this.sectionConfig, this.options);

        // Prepare the widgets for this section
        this._widgets = {
            ...switchPersonsWidget.getWidgetConfigs(),
            personVisitedPlacesTitle: getPersonVisitedPlacesTitleWidgetConfig(this.sectionConfig, this.options),
            ...personVisitedPlacesGroup.getWidgetConfigs(),
            personVisitedPlacesMap: getPersonVisitedPlacesMapConfig(this.options),
            buttonVisitedPlacesConfirmNextSection: getButtonConfirmGotoNextSectionWidgetConfig(
                this.sectionConfig,
                this.options
            )
        };
    }

    getSectionConfig(): SectionConfig {
        return this._sectionConfig!;
    }

    getWidgetConfigs(): Record<string, WidgetConfig> {
        return this._widgets!;
    }
}
