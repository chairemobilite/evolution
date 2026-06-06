/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    ButtonWidgetConfig,
    InterviewUpdateCallbacks,
    Journey,
    Person,
    UserInterviewAttributes,
    VisitedPlace,
    VisitedPlacesSectionConfiguration,
    WidgetConfig
} from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getResponse } from '../../../../utils/helpers';
import { isWorkOnTheRoad } from './helpers';

/**
 * Widget config factory for the buttons shown at the bottom of a single visited
 * place group. It returns the save, delete and cancel buttons for a visited
 * place.
 */
export class ButtonsVisitedPlaceConfigFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    // Action called when clicking on the delete or cancel buttons of a visited place
    private deleteVisitedPlaceButtonAction = (
        callbacks: InterviewUpdateCallbacks,
        interview: UserInterviewAttributes,
        path: string
    ) => {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (visitedPlaceContext === null) {
            throw new Error(
                'widgetDeleteVisitedPlace: action function: visited place context not found for path ' + path
            );
        }
        const { journey, visitedPlace, person } = visitedPlaceContext;
        // Delete the visited place
        odHelpers.deleteVisitedPlace({
            interview,
            person,
            journey,
            visitedPlace,
            startRemoveGroupedObjects: callbacks.startRemoveGroupedObjects,
            startUpdateInterview: callbacks.startUpdateInterview
        });
    };

    private getDeleteVisitedPlaceButtonWidgetConfig = (): ButtonWidgetConfig => ({
        type: 'button',
        color: 'red',
        icon: this.options.iconMapper['delete-trash'],
        label: (t: TFunction) => t('visitedPlaces:deleteThisGroupedObject'),
        hideWhenRefreshing: true,
        path: 'deleteVisitedPlace',
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetDeleteVisitedPlace: conditional function: visited place context not found for path ' + path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // Only show the delete button if there is more than one visited
            // place and the activity category of the visited place is set
            // (which means that the user has started filling the visited place
            // form)
            const visitePlacesArray = odHelpers.getVisitedPlacesArray({ journey });

            return [visitePlacesArray.length > 1 && !_isBlank(visitedPlace.activityCategory), undefined];
        },
        align: 'center',
        size: 'small',
        confirmPopup: {
            content: (t: TFunction) => t('visitedPlaces:ConfirmDeleteVisitedPlace')
        },
        action: this.deleteVisitedPlaceButtonAction
    });

    private getCancelVisitedPlaceButtonWidgetConfig = (): ButtonWidgetConfig => ({
        type: 'button',
        color: 'grey',
        label: (t: TFunction) => t('main:Cancel'),
        hideWhenRefreshing: true,
        path: 'cancelVisitedPlace',
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetCancelVisitedPlace: conditional function: visited place context not found for path ' + path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // Only show the cancel button if there is more than one visited
            // place and the activity category of the visited place is not set
            // (which means that the user has not started filling the visited
            // place form yet)
            const visitePlacesArray = odHelpers.getVisitedPlacesArray({ journey });

            return [visitePlacesArray.length > 1 && _isBlank(visitedPlace.activityCategory), undefined];
        },
        align: 'center',
        size: 'small',
        action: this.deleteVisitedPlaceButtonAction
    });

    // FIXME There's quite a bit of code related to work on the road and loop activities. If we handle them differently at some point, revisit this (issue #1448)
    private prefillPreviousVisitedPlace = ({
        currentVisitedPlace,
        previousVisitedPlace
    }: {
        currentVisitedPlace: VisitedPlace;
        previousVisitedPlace: VisitedPlace | null;
    }): Partial<VisitedPlace> | undefined => {
        // on the road departure: home but previous is not home: insert home before on the road:
        if (
            currentVisitedPlace.onTheRoadPreviousPlaceActivity === 'home' &&
            (!previousVisitedPlace || previousVisitedPlace.activity !== 'home')
        ) {
            return {
                activity: 'home',
                activityCategory: 'home',
                nextPlaceCategory: 'visitedAnotherPlace',
                arrivalTime: currentVisitedPlace._previousArrivalTime
                    ? currentVisitedPlace._previousArrivalTime
                    : undefined,
                departureTime: odHelpers.isLoopActivity({ visitedPlace: currentVisitedPlace })
                    ? currentVisitedPlace.arrivalTime
                    : undefined
            };

            // on the road departure: usual work place but previous is not workUsual: insert work usual before on the road:
        } else if (
            currentVisitedPlace.onTheRoadPreviousPlaceActivity === 'workUsual' &&
            (!previousVisitedPlace || previousVisitedPlace.activity !== 'workUsual')
        ) {
            return {
                activity: 'workUsual',
                activityCategory: 'work',
                nextPlaceCategory: 'visitedAnotherPlace',
                arrivalTime: currentVisitedPlace._previousArrivalTime
                    ? currentVisitedPlace._previousArrivalTime
                    : undefined,
                departureTime:
                    currentVisitedPlace.activity === 'workOnTheRoad' ? currentVisitedPlace.arrivalTime : undefined
            };
        }
        return undefined;
    };

    // FIXME There's quite a bit of code related to work on the road and loop activities. If we handle them differently at some point, revisit this (issue #1448)
    private prefillNextVisitedPlace = ({
        currentVisitedPlace,
        nextVisitedPlace
    }: {
        currentVisitedPlace: VisitedPlace;
        nextVisitedPlace: VisitedPlace | null;
    }): Partial<VisitedPlace> | undefined => {
        // next place category or on the road arrival type is workUsual but next is not workUsusal: insert workUsual after:
        if (
            (currentVisitedPlace.nextPlaceCategory === 'wentToUsualWorkPlace' ||
                currentVisitedPlace.onTheRoadNextPlaceCategory === 'wentToUsualWorkPlace') &&
            (!nextVisitedPlace || nextVisitedPlace.activity !== 'workUsual')
        ) {
            return {
                activity: 'workUsual',
                activityCategory: 'work',
                arrivalTime: isWorkOnTheRoad(currentVisitedPlace) ? currentVisitedPlace.departureTime : undefined
            };

            // next place category is other but next is not other: insert other after:
        } else if (
            (currentVisitedPlace.nextPlaceCategory === 'visitedAnotherPlace' ||
                currentVisitedPlace.onTheRoadNextPlaceCategory === 'visitedAnotherPlace') &&
            (!nextVisitedPlace ||
                nextVisitedPlace.activityCategory === 'home' ||
                (isWorkOnTheRoad(currentVisitedPlace) && nextVisitedPlace.activity === 'workUsual'))
        ) {
            return {
                arrivalTime: odHelpers.isLoopActivity({ visitedPlace: currentVisitedPlace })
                    ? currentVisitedPlace.departureTime
                    : undefined
            };

            // next place category is home but next is not home: insert home after:
        } else if (
            (currentVisitedPlace.nextPlaceCategory === 'wentBackHome' ||
                currentVisitedPlace.onTheRoadNextPlaceCategory === 'wentBackHome') &&
            !_isBlank(currentVisitedPlace.activityCategory) &&
            currentVisitedPlace.activityCategory !== 'home' &&
            (!nextVisitedPlace || nextVisitedPlace.activityCategory !== 'home')
        ) {
            return {
                activity: 'home',
                activityCategory: 'home',
                arrivalTime: odHelpers.isLoopActivity({ visitedPlace: currentVisitedPlace })
                    ? currentVisitedPlace.departureTime
                    : undefined
            };
        }
        return undefined;
    };

    // FIXME There's quite a bit of code related to work on the road and loop
    // activities. If we handle them differently at some point, revisit this and
    // move the rest to the `reconcileVisitedPlaces` helper function (issue
    // #1448)
    private updateOtherPlacesTimes = ({
        person,
        journey,
        visitedPlace,
        previousVisitedPlace,
        nextVisitedPlace
    }: {
        person: Person;
        journey: Journey;
        visitedPlace: VisitedPlace;
        previousVisitedPlace: VisitedPlace | null;
        nextVisitedPlace: VisitedPlace | null;
    }): Record<string, unknown> => {
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces.${visitedPlace._uuid}`;

        const previousVisitedPlacePath = previousVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces.${previousVisitedPlace._uuid}`
            : null;

        const nextVisitedPlacePath = nextVisitedPlace
            ? `household.persons.${person._uuid}.journeys.${journey._uuid}.visitedPlaces.${nextVisitedPlace._uuid}`
            : null;
        const updateValuesbyPath = {};

        // for on the road with insertion between previous and on the road vp:
        if (
            previousVisitedPlace &&
            _isBlank(previousVisitedPlace.departureTime) &&
            !_isBlank(visitedPlace._previousPreviousDepartureTime)
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.departureTime`] =
                visitedPlace._previousPreviousDepartureTime;
            updateValuesbyPath[`response.${previousVisitedPlacePath}._isNew`] = false;
        } else if (
            previousVisitedPlace &&
            _isBlank(previousVisitedPlace.departureTime) &&
            !_isBlank(visitedPlace._previousDepartureTime)
        ) {
            updateValuesbyPath[`response.${previousVisitedPlacePath}.departureTime`] =
                visitedPlace._previousDepartureTime;
            updateValuesbyPath[`response.${previousVisitedPlacePath}._isNew`] = false;
        }

        // Make sure the current visited place is not marked as new anymore
        updateValuesbyPath[`response.${visitedPlacePath}._isNew`] = false;

        // Match arrival/departure time of moving activities with the previous/next times
        if (
            nextVisitedPlace &&
            (odHelpers.isLoopActivity({ visitedPlace: nextVisitedPlace }) ||
                odHelpers.isLoopActivity({ visitedPlace: visitedPlace }))
        ) {
            updateValuesbyPath[`response.${nextVisitedPlacePath}.arrivalTime`] = visitedPlace.departureTime;
        }
        return updateValuesbyPath;
    };

    private getSaveVisitedPlaceButtonWidgetConfig = (): ButtonWidgetConfig => ({
        type: 'button',
        color: 'green',
        label: (t: TFunction) => t('main:Confirm'),
        hideWhenRefreshing: true,
        path: 'saveVisitedPlace',
        icon: this.options.iconMapper['check-circle'],
        align: 'center',
        action: this.options.buttonActions.validateButtonAction,
        saveCallback: async (callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetSaveVisitedPlace: saveCallback function: visited place context not found for path ' + path
                );
            }
            const { person, journey, visitedPlace } = visitedPlaceContext;

            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                visitedPlaceId: visitedPlace._uuid,
                journey: journey
            });
            const nextVisitedPlace = odHelpers.getNextVisitedPlace({
                visitedPlaceId: visitedPlace._uuid,
                journey: journey
            });

            // This function reconciles the timing and assigns them to the proper place
            const updatedValuesByPath = this.updateOtherPlacesTimes({
                person,
                journey,
                visitedPlace,
                previousVisitedPlace,
                nextVisitedPlace
            });

            // Add the previous visited place if needed
            const addedGroupedObjectBefore = this.prefillPreviousVisitedPlace({
                currentVisitedPlace: visitedPlace,
                previousVisitedPlace
            });
            // Add the next visited place if needed
            const addedGroupedObjectAfter = this.prefillNextVisitedPlace({
                currentVisitedPlace: visitedPlace,
                nextVisitedPlace
            });

            if (addedGroupedObjectBefore) {
                await odHelpers.insertVisitedPlace({
                    person,
                    journey,
                    newVisitedPlace: addedGroupedObjectBefore,
                    insertSequence: visitedPlace._sequence,
                    startAddGroupedObjects: callbacks.startAddGroupedObjects
                });
            }
            if (addedGroupedObjectAfter) {
                // The sequence would be 2+ because if a place place added before, otherwise, it is the current sequence + 1 only.
                const nextSequence = addedGroupedObjectBefore ? visitedPlace._sequence + 2 : visitedPlace._sequence + 1;
                await odHelpers.insertVisitedPlace({
                    person,
                    journey,
                    newVisitedPlace: addedGroupedObjectAfter,
                    insertSequence: nextSequence,
                    startAddGroupedObjects: callbacks.startAddGroupedObjects
                });
            }

            callbacks.startUpdateInterview(
                { sectionShortname: 'visitedPlaces', valuesByPath: updatedValuesByPath },
                (updatedInterview) => {
                    // Select the first incomplete place to be the active one,
                    // but only if the active person and journey are the same,
                    // otherwise, the participant has moved away from this
                    // journey, we ignore.
                    if (
                        getResponse(updatedInterview, '_activePersonId', null) !== person._uuid ||
                        getResponse(updatedInterview, '_activeJourneyId', null) !== journey._uuid
                    ) {
                        return;
                    }
                    // The previous updates may have changed the visited place
                    // list and the journey, so we need to wait for the
                    // interview to be updated before getting the context again
                    // and finding the next incomplete place.
                    const journeyContext = odHelpers.getJourneyContextFromPath({ interview: updatedInterview, path });
                    if (journeyContext === null) {
                        throw new Error(
                            'widgetSaveVisitedPlace: saveCallback function: journey context not found for path ' +
                                path +
                                ' after update'
                        );
                    }
                    const { person: updatedPerson, journey: updatedJourney } = journeyContext;
                    const nextIncompletePlace = odHelpers.getFirstIncompleteVisitedPlace({
                        interview: updatedInterview,
                        journey: updatedJourney,
                        person: updatedPerson
                    });
                    const updateActivePlaceValuesByPath = {
                        ['response._activeVisitedPlaceId']: nextIncompletePlace ? nextIncompletePlace._uuid : null
                    };
                    callbacks.startUpdateInterview({
                        sectionShortname: 'visitedPlaces',
                        valuesByPath: updateActivePlaceValuesByPath
                    });
                }
            );
        }
    });

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        return {
            buttonSaveVisitedPlace: this.getSaveVisitedPlaceButtonWidgetConfig(),
            buttonDeleteVisitedPlace: this.getDeleteVisitedPlaceButtonWidgetConfig(),
            buttonCancelVisitedPlace: this.getCancelVisitedPlaceButtonWidgetConfig()
        };
    };
}
