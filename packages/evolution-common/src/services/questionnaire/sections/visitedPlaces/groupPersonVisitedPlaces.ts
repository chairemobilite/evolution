/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _escape from 'lodash/escape';
import type { GroupConfig, VisitedPlacesSectionConfiguration, WidgetConfig } from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { getActivityCategoryWidgetConfig } from './widgetActivityCategory';
import { getActivityWidgetConfig } from './widgetActivity';
import { VisitedPlaceGeographyWidgetFactory } from './widgetsGeography';
import { getNextPlaceCategoryWidgetConfig } from './widgetNextPlaceCategory';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { VisitedPlaceShortcutWidgetFactory } from './widgetsVisitedPlaceShortcut';

/**
 * Widget config factory for the person visited places group. It represents the
 * group of questions related to each visited place of the person. It returns
 * all builtin widgets necessary for the visited place questions, according to
 * the trip diary configuration.
 */
export class PersonVisitedPlacesGroupConfigFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    private getGroupWidgetNames = (): string[] => {
        const additionalWidgetNames = this.sectionConfig.additionalVisitedPlacesWidgetNames || [];
        // Make sure all mandatory questions of the group are included, they
        // could be listed in the additional widgets to control their order, but
        // if not there, we should add them at the right place.
        const allWidgetNames = [...additionalWidgetNames];
        // Add the geography, shortcuts and activity widgets at the beginning of the groups, listed in reverse order of appearance to unshift them in the right order
        // FIXME Allow to fine-tune where to put the additional widgets if a survey needs a question to be asked between the builtin ones
        const widgetsAtTheBeginning = [
            'visitedPlaceGeography',
            'visitedPlaceName',
            'visitedPlaceShortcut',
            'visitedPlaceAlreadyVisited',
            'visitedPlaceActivity',
            'visitedPlaceActivityCategory'
        ];
        for (const widgetName of widgetsAtTheBeginning) {
            if (!allWidgetNames.includes(widgetName)) {
                allWidgetNames.unshift(widgetName);
            }
        }
        const widgetsAtTheEnd = ['visitedPlaceNextPlaceCategory'];
        for (const widgetName of widgetsAtTheEnd) {
            if (!allWidgetNames.includes(widgetName)) {
                allWidgetNames.push(widgetName);
            }
        }
        return Array.from(new Set(allWidgetNames));
    };

    private getVisitedPlacesGroupConfig = (): GroupConfig => {
        return {
            type: 'group',
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
            title: (t: TFunction) => t('visitedPlaces:personVisitedPlacesGroupTitle'),
            filter: function (interview, groupedObjects) {
                // Keep only the grouped object that corresponds to the active
                // visited place, so that only one is shown at a time in the
                // group, and it is always the same one as the one shown in the
                // title widget that is outside of the group.
                const journey = odHelpers.getActiveJourney({ interview }); // Ensure the active journey is set
                const activeVisitedPlace = odHelpers.getActiveVisitedPlace({ interview, journey });
                if (activeVisitedPlace) {
                    const filteredGroupedObject = {};
                    for (const groupedObjectId in groupedObjects) {
                        if (groupedObjectId === activeVisitedPlace._uuid) {
                            filteredGroupedObject[groupedObjectId] = groupedObjects[groupedObjectId];
                        }
                    }
                    return filteredGroupedObject;
                } else {
                    return {};
                }
            },
            name: (t: TFunction, groupedObject: unknown, sequence: number) => {
                const groupNameStrings = [t('visitedPlaces:VisitedPlaceSequence', { count: sequence })];
                const placeString = (groupedObject as any).name
                    ? `**${_escape((groupedObject as any).name)}**`
                    : (groupedObject as any).activity
                        ? `**${t(`visitedPlaces:activities:${(groupedObject as any).activity}`)}**`
                        : undefined;
                if (!_isBlank(placeString)) {
                    groupNameStrings.push(placeString as string);
                }
                return groupNameStrings.join(' • ');
            },
            showGroupedObjectDeleteButton: false,
            deleteConfirmPopup: {
                content: (t: TFunction) => t('visitedPlaces:ConfirmDeleteVisitedPlace')
            },
            showGroupedObjectAddButton: true,
            addButtonLocation: 'both',
            widgets: this.getGroupWidgetNames()
        };
    };

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        const geographyWidgetFactory = new VisitedPlaceGeographyWidgetFactory(this.sectionConfig, this.options);
        const visitedPlaceShortcutWidgetFactory = new VisitedPlaceShortcutWidgetFactory(
            this.sectionConfig,
            this.options
        );
        return {
            personVisitedPlaces: this.getVisitedPlacesGroupConfig(),
            visitedPlaceActivityCategory: getActivityCategoryWidgetConfig(this.sectionConfig, this.options),
            visitedPlaceActivity: getActivityWidgetConfig(this.sectionConfig, this.options),
            ...visitedPlaceShortcutWidgetFactory.getWidgetConfigs(),
            ...geographyWidgetFactory.getWidgetConfigs(),
            visitedPlaceNextPlaceCategory: getNextPlaceCategoryWidgetConfig(this.sectionConfig, this.options)
        };
    };
}
