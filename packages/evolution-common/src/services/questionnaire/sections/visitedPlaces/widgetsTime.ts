/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _escape from 'lodash/escape';
import _max from 'lodash/max';
import _min from 'lodash/min';
import i18n, { type TFunction } from 'i18next';
import type {
    InputTimeType,
    BaseQuestionType,
    VisitedPlacesSectionConfiguration,
    UserInterviewAttributes,
    VisitedPlace
} from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { formatTripDuration, isWorkOnTheRoad } from './helpers';
import { requiredValidation } from '../../../widgets/validations/validations';

export type TimeWidgetOptions = Pick<
    BaseQuestionType,
    'path' | 'label' | 'twoColumns' | 'containsHtml' | 'conditional' | 'validations'
> &
    Pick<
        InputTimeType,
        | 'minuteStep'
        | 'addHourSeparators'
        | 'suffixTimes'
        | 'minTimeSecondsSinceMidnight'
        | 'maxTimeSecondsSinceMidnight'
    >;

const getTimeWidgetConfig = (options: TimeWidgetOptions): InputTimeType => ({
    type: 'question',
    inputType: 'time',
    path: options.path,
    datatype: 'integer',
    twoColumns: options.twoColumns ?? false,
    containsHtml: options.containsHtml ?? false,
    label: options.label,
    minuteStep: options.minuteStep,
    addHourSeparators: options.addHourSeparators ?? true,
    suffixTimes: options.suffixTimes,
    minTimeSecondsSinceMidnight: options.minTimeSecondsSinceMidnight,
    maxTimeSecondsSinceMidnight: options.maxTimeSecondsSinceMidnight,
    validations: options.validations ?? requiredValidation,
    conditional: options.conditional
});

const timeFields = [
    '_previousPreviousDepartureTime',
    '_previousArrivalTime',
    '_previousDepartureTime',
    'arrivalTime',
    'departureTime'
] as const;
type TimeField = (typeof timeFields)[number];

/**
 * For single-day trip diaries, this class provides the required widgets to
 * allow to specify the arrival and departure times, handling missing data from
 * previous places, if necessary, or for some specific activities that require
 * additional timings. All widgets are time widgets, the times are at 5 minutes
 * interval, except for the first requested time of the day, where it is 15
 * minutes (to avoid too long lists if the day started late).
 *
 * It provides 5 widgets:
 *
 * - `visitedPlacePreviousPreviousDepartureTime`: Typically shown when the
 *   current place is a work on the road, with departure type that does not
 *   match the previous visited place and the previous visited place's departure
 *   time was not set. The labels to override for this widget are:
 *   `visitedPlaces:visitedPlacePreviousPreviousDepartureTime` and the variants
 *   for specific activities, with
 *   `visitedPlaces:visitedPlacePreviousPreviousDepartureTime_${previousActivity}_${onTheRoadPreviousPlaceActivity}`
 *   and
 *   `visitedPlaces:visitedPlacePreviousPreviousDepartureTime_${onTheRoadPreviousPlaceActivity}`,
 *   with gender context, nickname, count as parameters, as well as
 *   previousPlaceDescription and departureTypeActivity.
 * - `visitedPlacePreviousArrivalTime`: Shown when the current place is a work
 *   on the road with departure type that does not match the previous visited
 *   place, so we need to ask for the arrival time at the work on the road's
 *   departure place. The labels to override for this widget are
 *   `visitedPlaces:visitedPlacePreviousArrivalTime_usualWorkPlace` and
 *   `visitedPlaces:visitedPlacePreviousArrivalTime_home`, with gender context,
 *   nickname and count as parameters.
 * - `visitedPlacePreviousDepartureTime`: Shown when the previous visited
 *   place's departure time is not set, to be able to set it upon saving the
 *   current place. If the activity is a loop activity, it is equal to the
 *   current place's arrival time. The labels to override for this widget are
 *   `visitedPlaces:visitedPlacePreviousDepartureTime` and the variants for
 *   specific activities, with
 *   `visitedPlaces:visitedPlacePreviousDepartureTime_${previousActivity}_${currentActivity}`
 *   and
 *   `visitedPlaces:visitedPlacePreviousDepartureTime_${previousActivity}_other`,
 *   with gender context, nickname, count, previousPlaceDescription and
 *   visitedPlaceDescription as parameters.
 * - `visitedPlaceArrivalTime`: Shown when the visited place is not the last
 *   one. The labels to override for this widget are
 *   `visitedPlaces:visitedPlaceArrivalTime` and the variant for specific
 *   activities `visitedPlaces:visitedPlaceArrivalTime_${currentActivity}`, with
 *   gender context, nickname, count and place as parameters.
 * - `visitedPlaceDepartureTime`: Shown when the visited place is not the last
 *   one. The labels to override for this widget are
 *   `visitedPlaces:visitedPlaceDepartureTime` and the variant for specific
 *   activities `visitedPlaces:visitedPlaceDepartureTime_${currentActivity}`,
 *   with gender context, nickname, count and place as parameters.
 */
export class VisitedPlaceTimeWidgetFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    private previousPreviousDepartureTimeIsVisible(
        visitedPlace: VisitedPlace,
        previousVisitedPlace: VisitedPlace | null
    ): [boolean, number | null | undefined] {
        // Do not display if no previous place or not work on the road
        if (!previousVisitedPlace || !isWorkOnTheRoad(visitedPlace)) {
            return [false, null];
        }
        // Show if the previous place departure time is not set and the current
        // place is a work on the road whose departure place type is not the
        // previous place's activity (a place will need to be inserted before
        // the current one upon saving)

        // FIXME Why only usualWorkPlace and not home? Should we do the same for
        // the home? Add the missing home place before the current one and set
        // the previous place time? It was like that in od_nationale_quebec.
        // Probably because this case should happen only at the beginning of the
        // day, when the first place of the day is home and thus we start at the
        // second. In all other cases, departureTime should be set.
        if (
            previousVisitedPlace.activity &&
            _isBlank(previousVisitedPlace.departureTime) &&
            visitedPlace.onTheRoadPreviousPlaceActivity === 'workUsual' &&
            previousVisitedPlace.activity !== 'workUsual'
        ) {
            return [true, null];
        }
        return [false, null];
    }

    private previousArrivalTimeIsVisible(
        visitedPlace: VisitedPlace,
        previousVisitedPlace: VisitedPlace | null
    ): [boolean, number | null | undefined] {
        // Do not display if no previous place or not work on the road
        if (!previousVisitedPlace || !isWorkOnTheRoad(visitedPlace)) {
            return [false, null];
        }
        // Show if there is a visited place to insert before the work on the
        // road, ie if the onTheRoadPreviousPlaceActivity does not match the previous
        // place's activity.
        if (visitedPlace.onTheRoadPreviousPlaceActivity) {
            if (visitedPlace.onTheRoadPreviousPlaceActivity === 'home' && previousVisitedPlace.activity !== 'home') {
                return [true, null];
            } else if (
                visitedPlace.onTheRoadPreviousPlaceActivity === 'workUsual' &&
                previousVisitedPlace.activity !== 'workUsual'
            ) {
                return [true, null];
            }
        }
        return [false, null];
    }

    private previousDepartureTimeIsVisible(
        visitedPlace: VisitedPlace,
        previousVisitedPlace: VisitedPlace | null
    ): [boolean, number | null | undefined] {
        // Show only if there is a previous place and the previous place
        // does not have a departure time already defined
        if (previousVisitedPlace && visitedPlace.activity && _isBlank(previousVisitedPlace.departureTime)) {
            // If the current place is a loop activity, assume the previous departure is same as current arrival time
            if (odHelpers.isLoopActivity({ visitedPlace })) {
                return [false, visitedPlace.arrivalTime];
            }
            return [true, null];
        }
        return [false, null];
    }

    // Get a parsing function that returns the maximum time from previous places, with a reference field set
    private getTimeSecondsLowerBoundFromPreviousPlacesAndTimes =
        (field: TimeField): InputTimeType['minTimeSecondsSinceMidnight'] =>
            (interview, path) => {
                const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
                if (visitedPlaceContext === null) {
                    throw new Error(
                        'time lower bound for field: ' + field + ': visited place context not found for path ' + path
                    );
                }
                const { journey, visitedPlace } = visitedPlaceContext;

                // Get the previous fields in the order of precedence then, if
                // any time is specified for any of those fields, starting from
                // the latest, that would be the max previous time
                const previousTimeFields = timeFields.slice(0, timeFields.indexOf(field));
                for (let i = previousTimeFields.length - 1; i >= 0; i--) {
                    if (!_isBlank(visitedPlace[previousTimeFields[i]])) {
                        return visitedPlace[previousTimeFields[i]] as number;
                    }
                }

                // Otherwise, get the maximum time from the previous visited places (sequence lower than current place's sequence)
                const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
                const visitedPlacesBeforeArray = visitedPlacesArray.filter((vp) => {
                    return vp._sequence < visitedPlace._sequence;
                });

                const lowerBoundSecondsSinceMidnight = this.sectionConfig.tripDiaryMinTimeOfDay;
                if (visitedPlacesBeforeArray.length > 0) {
                    const previousTimes = visitedPlacesBeforeArray.map((vp) => {
                        if (!_isBlank(vp.departureTime)) {
                            return vp.departureTime as number;
                        } else if (!_isBlank(vp.arrivalTime)) {
                            return vp.arrivalTime as number;
                        }
                        return lowerBoundSecondsSinceMidnight;
                    });

                    return _max(previousTimes) as number;
                }
                return lowerBoundSecondsSinceMidnight;
            };

    // Get a parsing function that returns the minimum time from next places,
    // with a reference field set. Do not use the times from loop activities if
    // `ignoreNextLoopActivities` is true, as those times are already bounded
    // and we wouldn't be able to change them.
    private getTimeSecondsUpperBoundFromNextPlacesAndTimes =
        (field: TimeField, ignoreNextLoopActivities: boolean = false): InputTimeType['maxTimeSecondsSinceMidnight'] =>
            (interview, path) => {
                const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
                if (visitedPlaceContext === null) {
                    throw new Error(
                        'time upper bound for field: ' + field + ': visited place context not found for path ' + path
                    );
                }
                const { journey, visitedPlace } = visitedPlaceContext;

                // Get the next fields in the order of precedence then, if
                // any time is specified for any of those fields, starting from
                // the latest, that would be the max previous time
                const nextTimeFields = timeFields.slice(timeFields.indexOf(field) + 1);
                for (let i = 0; i < nextTimeFields.length; i++) {
                    if (!_isBlank(visitedPlace[nextTimeFields[i]])) {
                        return visitedPlace[nextTimeFields[i]] as number;
                    }
                }

                // Otherwise, get the minimum time from the next visited places (sequence higher than current place's sequence)
                const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
                const visitedPlacesAfterArray = visitedPlacesArray.filter((vp) => {
                    return (
                        vp._sequence > visitedPlace._sequence &&
                    (!ignoreNextLoopActivities || !odHelpers.isLoopActivity({ visitedPlace: vp }))
                    );
                });

                const upperBoundSecondsSinceMidnight = this.sectionConfig.tripDiaryMaxTimeOfDay;
                if (visitedPlacesAfterArray.length > 0) {
                    const nextTimes = visitedPlacesAfterArray.map((vp) => {
                        if (!_isBlank(vp.arrivalTime)) {
                            return vp.arrivalTime as number;
                        } else if (!_isBlank(vp.departureTime)) {
                            return vp.departureTime as number;
                        }
                        return upperBoundSecondsSinceMidnight;
                    });

                    return _min(nextTimes) as number;
                }
                return upperBoundSecondsSinceMidnight;
            };

    private getSuffixTimes = (_interview: UserInterviewAttributes, _timeField: TimeField = 'arrivalTime') => {
        // return an object: {[secondsSinceMidnight (string)]: suffix (string)}
        const suffixTimes = {};

        // TODO Implement correctly, but specify first!
        return suffixTimes;
    };

    private getPreviousPreviousDepartureTimeWidgetConfiguration = (): TimeWidgetOptions => ({
        path: '_previousPreviousDepartureTime',
        containsHtml: true,
        minuteStep: 5,
        conditional: (interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousPreviousDepartureTime: conditional function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            return this.previousPreviousDepartureTimeIsVisible(visitedPlace, previousVisitedPlace);
        },
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousPreviousDepartureTime: label function: visited place context not found for path ' +
                        path
                );
            }
            const { person, journey, visitedPlace } = visitedPlaceContext;
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            if (previousVisitedPlace === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousPreviousDepartureTime: label function: previous visited place not found for path ' +
                        path
                );
            }
            const onTheRoadPreviousPlaceActivity = visitedPlace.onTheRoadPreviousPlaceActivity;
            const previousPlaceDescription = odHelpers.getVisitedPlaceDescription({
                visitedPlace: previousVisitedPlace,
                interview,
                person,
                t,
                options: {
                    allowHtml: false,
                    withActivity: false,
                    withPersonIdentification: false,
                    withTimes: false
                }
            });

            const keys = [
                `visitedPlaces:visitedPlacePreviousPreviousDepartureTime_${previousVisitedPlace?.activity}_${onTheRoadPreviousPlaceActivity}`,
                `visitedPlaces:visitedPlacePreviousPreviousDepartureTime_${onTheRoadPreviousPlaceActivity}`,
                'visitedPlaces:visitedPlacePreviousPreviousDepartureTime'
            ];
            return t(keys, {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname: odHelpers.getPersonIdentificationString({ person, t }),
                count: odHelpers.getCountOrSelfDeclared({ interview, person }),
                previousPlaceDescription,
                departureTypeActivity: t(`visitedPlaces:activities:${onTheRoadPreviousPlaceActivity}`)
            });
        },
        minTimeSecondsSinceMidnight: this.getTimeSecondsLowerBoundFromPreviousPlacesAndTimes(
            '_previousPreviousDepartureTime'
        ),
        maxTimeSecondsSinceMidnight: this.getTimeSecondsUpperBoundFromNextPlacesAndTimes(
            '_previousPreviousDepartureTime'
        )
    });

    private getPreviousArrivalTimeWidgetConfiguration = (): TimeWidgetOptions => ({
        path: '_previousArrivalTime',
        containsHtml: true,
        minuteStep: 5,
        conditional: (interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousArrivalTime: conditional function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            return this.previousArrivalTimeIsVisible(visitedPlace, previousVisitedPlace);
        },
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousArrivalTime: label function: visited place context not found for path ' +
                        path
                );
            }
            const { person, visitedPlace } = visitedPlaceContext;

            const onTheRoadPreviousPlaceActivity = visitedPlace.onTheRoadPreviousPlaceActivity;

            const nickname = odHelpers.getPersonIdentificationString({ person, t });
            const keys = [
                `visitedPlaces:visitedPlacePreviousArrivalTime_${onTheRoadPreviousPlaceActivity}`,
                'visitedPlaces:visitedPlacePreviousArrivalTime'
            ];
            // Use specific keys with departure type if available, but fallback to generic one.
            return t(keys, {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname,
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        },
        minTimeSecondsSinceMidnight: this.getTimeSecondsLowerBoundFromPreviousPlacesAndTimes('_previousArrivalTime'),
        maxTimeSecondsSinceMidnight: this.getTimeSecondsUpperBoundFromNextPlacesAndTimes('_previousArrivalTime')
    });

    private getPreviousDepartureTimeWidgetConfiguration = (): TimeWidgetOptions => ({
        path: '_previousDepartureTime',
        containsHtml: true,
        minuteStep: (interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousDepartureTime: minuteStep function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // 15 minutes step if the previous place is new and this is the second place (start of day at home)
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            return visitedPlace._sequence === 2 && previousVisitedPlace !== null && previousVisitedPlace._isNew === true
                ? 15
                : 5;
        },
        conditional: (interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousDepartureTime: conditional function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            return this.previousDepartureTimeIsVisible(visitedPlace, previousVisitedPlace);
        },
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlacePreviousDepartureTime: label function: visited place context not found for path ' +
                        path
                );
            }
            const { person, journey, visitedPlace } = visitedPlaceContext;

            // The widget is shown only when there is a previous visited place without departure time and this is not a loop activity
            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            }) as VisitedPlace;

            const previousPlaceDescription = odHelpers.getVisitedPlaceDescription({
                visitedPlace: previousVisitedPlace,
                interview,
                person,
                t,
                options: {
                    allowHtml: false,
                    withActivity: false,
                    withPersonIdentification: false,
                    withTimes: false
                }
            });
            const visitedPlaceDescription = odHelpers.getVisitedPlaceDescription({
                visitedPlace: visitedPlace,
                interview,
                person,
                t,
                options: {
                    allowHtml: false,
                    withActivity: false,
                    withPersonIdentification: false,
                    withTimes: false
                }
            });

            // Allow to set specific labels based on the previous and current
            // activities, but default to a generic one with the previous place
            // description if not defined
            const keys: string[] = [];
            keys.push(
                `visitedPlaces:visitedPlacePreviousDepartureTime_${previousVisitedPlace.activity}_${visitedPlace.activity}`
            );
            keys.push(`visitedPlaces:visitedPlacePreviousDepartureTime_${previousVisitedPlace.activity}_other`);
            keys.push('visitedPlaces:visitedPlacePreviousDepartureTime');
            return t(keys, {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname: odHelpers.getPersonIdentificationString({ person, t }),
                count: odHelpers.getCountOrSelfDeclared({ interview, person }),
                previousPlaceDescription,
                visitedPlaceDescription
            });
        },
        minTimeSecondsSinceMidnight: this.getTimeSecondsLowerBoundFromPreviousPlacesAndTimes('_previousDepartureTime'),
        maxTimeSecondsSinceMidnight: this.getTimeSecondsUpperBoundFromNextPlacesAndTimes('_previousDepartureTime')
    });

    private getArrivalTimeWidgetConfiguration = (): TimeWidgetOptions => ({
        path: 'arrivalTime',
        minuteStep: 5,
        containsHtml: true,
        conditional: (interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceArrivalTime: conditional function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;

            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });

            // Do not show if any of the widgets for previous times is visible
            // and they are not yet set (will serve as boundary for this one)
            const [previousDepartureTimeIsVisible] = this.previousDepartureTimeIsVisible(
                visitedPlace,
                previousVisitedPlace
            );
            const [previousArrivalTimeIsVisible] = this.previousArrivalTimeIsVisible(
                visitedPlace,
                previousVisitedPlace
            );
            const [previousPreviousDepartureTimeIsVisible] = this.previousPreviousDepartureTimeIsVisible(
                visitedPlace,
                previousVisitedPlace
            );
            if (
                (previousDepartureTimeIsVisible && _isBlank(visitedPlace._previousDepartureTime)) ||
                (previousArrivalTimeIsVisible && _isBlank(visitedPlace._previousArrivalTime)) ||
                (previousPreviousDepartureTimeIsVisible && _isBlank(visitedPlace._previousPreviousDepartureTime))
            ) {
                return [false, null];
            }
            // Use to previous departure time if either the current or previous
            // activity is a loop activity and the departure time is set
            if (
                previousVisitedPlace &&
                (odHelpers.isLoopActivity({ visitedPlace }) ||
                    odHelpers.isLoopActivity({ visitedPlace: previousVisitedPlace })) &&
                !_isBlank(previousVisitedPlace.departureTime)
            ) {
                return [false, previousVisitedPlace.departureTime];
            }

            // Show if the activity is set and it is not the first place (start of day)
            return [!_isBlank(visitedPlace.activity) && visitedPlace._sequence > 1, null];
        },
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceArrivalTime: label function: visited place context not found for path ' + path
                );
            }
            const { person, journey, visitedPlace } = visitedPlaceContext;
            const visitedPlaceName = visitedPlace.name;

            const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
                journey,
                visitedPlaceId: visitedPlace._uuid
            });
            const previousVisitedPlaceDepartureTime =
                typeof visitedPlace._previousDepartureTime === 'number'
                    ? visitedPlace._previousDepartureTime
                    : previousVisitedPlace
                        ? previousVisitedPlace.departureTime
                        : null;

            // Show duration if previous and current visited places are not loop
            // activities and previous departure time and current arrival time
            // are not blank
            let durationText: string | null = null;
            if (
                typeof previousVisitedPlaceDepartureTime === 'number' &&
                typeof visitedPlace.arrivalTime === 'number' &&
                !odHelpers.isLoopActivity({ visitedPlace }) &&
                (!previousVisitedPlace || !odHelpers.isLoopActivity({ visitedPlace: previousVisitedPlace }))
            ) {
                durationText = formatTripDuration(previousVisitedPlaceDepartureTime, visitedPlace.arrivalTime, t);
            }

            // Specific keys for some of the loop activities
            const keys = [
                `visitedPlaces:visitedPlaceArrivalTime_${visitedPlace.activity}`,
                'visitedPlaces:visitedPlaceArrivalTime'
            ];
            const place = !_isBlank(visitedPlaceName)
                ? t('visitedPlaces:atPlace', { placeName: _escape(visitedPlaceName) })
                : t('visitedPlaces:atThisPlace', { context: visitedPlace.activity });
            return (
                t(keys, {
                    context: odHelpers.getPersonGenderContext({ person }),
                    nickname: odHelpers.getPersonIdentificationString({ person, t }),
                    atPlace: place,
                    count: odHelpers.getCountOrSelfDeclared({ interview, person })
                }) + (durationText ? t('visitedPlaces:tripDurationText', { durationText }) : '')
            );
        },
        minTimeSecondsSinceMidnight: this.getTimeSecondsLowerBoundFromPreviousPlacesAndTimes('arrivalTime'),
        maxTimeSecondsSinceMidnight: this.getTimeSecondsUpperBoundFromNextPlacesAndTimes('arrivalTime'),
        suffixTimes: (interview) => {
            const suffixTimes = this.getSuffixTimes(interview, 'arrivalTime');
            // Add the 'or +' at the end of the last time option
            suffixTimes[String(this.sectionConfig.tripDiaryMaxTimeOfDay)] = ' ' + i18n.t('visitedPlaces:orPlus');

            return suffixTimes;
        }
    });

    private getDepartureTimeWidgetConfiguration = (): TimeWidgetOptions => ({
        path: 'departureTime',
        containsHtml: true,
        minuteStep: (interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceDepartureTime: minuteStep function: visited place context not found for path ' +
                        path
                );
            }
            const { visitedPlace } = visitedPlaceContext;
            // 15 minutes step for the first time the first place is shown (start of day)
            return visitedPlace._sequence === 1 && visitedPlace._isNew === true ? 15 : 5;
        },
        conditional: (interview: UserInterviewAttributes, path: string) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceDepartureTime: conditional function: visited place context not found for path ' +
                        path
                );
            }
            const { journey, visitedPlace } = visitedPlaceContext;
            // Do not show if the onTheRoadNextPlaceCategory is set and is not
            // "stayedThereUntilTheNextDay"

            // FIXME Remove when onTheRoadNextPlaceCategory is merged with nextCategory (#1555)
            if (
                visitedPlace.activity &&
                visitedPlace.onTheRoadNextPlaceCategory &&
                visitedPlace.onTheRoadNextPlaceCategory !== 'stayedThereUntilTheNextDay'
            ) {
                return [true, null];
            }

            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            // Do not show if the next place category is not set and the place is the last one. (we need to know it if needs to be shown)
            if (
                _isBlank((visitedPlace as any).nextPlaceCategory) &&
                visitedPlacesArray.length > 1 &&
                visitedPlacesArray[visitedPlacesArray.length - 1]._uuid === visitedPlace._uuid
            ) {
                return [false, null];
            }
            // Otherwise, show if the activity is set and either it is the first
            // place (start of day) or the next place category is not
            // "stayedThereUntilTheNextDay"
            return [
                !_isBlank(visitedPlace.activity) &&
                    (visitedPlace._sequence === 1 ||
                        (visitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay'),
                null
            ];
        },
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceDepartureTime: label function: visited place context not found for path ' + path
                );
            }
            const { person, visitedPlace } = visitedPlaceContext;

            const nickname = odHelpers.getPersonIdentificationString({ person, t });

            const visitedPlaceName = visitedPlace.name;
            const place =
                visitedPlace.activity === 'home'
                    ? t('visitedPlaces:theHome')
                    : !_isBlank(visitedPlaceName)
                        ? t('visitedPlaces:place', { placeName: _escape(visitedPlaceName) })
                        : t('visitedPlaces:thisPlace', { context: visitedPlace.activity });
            const keys = [
                `visitedPlaces:visitedPlaceDepartureTime_${visitedPlace.activity}`,
                'visitedPlaces:visitedPlaceDepartureTime'
            ];
            return t(keys, {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname,
                count: odHelpers.getCountOrSelfDeclared({ interview, person }),
                place: place
            });
        },
        minTimeSecondsSinceMidnight: this.getTimeSecondsLowerBoundFromPreviousPlacesAndTimes('departureTime'),
        maxTimeSecondsSinceMidnight: this.getTimeSecondsUpperBoundFromNextPlacesAndTimes(
            'departureTime',
            true /* ignoreNextLoopActivities */
        )
    });

    getWidgetConfigs = (): Record<string, InputTimeType> => {
        return {
            visitedPlacePreviousPreviousDepartureTime: getTimeWidgetConfig(
                this.getPreviousPreviousDepartureTimeWidgetConfiguration()
            ),
            visitedPlacePreviousArrivalTime: getTimeWidgetConfig(this.getPreviousArrivalTimeWidgetConfiguration()),
            visitedPlacePreviousDepartureTime: getTimeWidgetConfig(this.getPreviousDepartureTimeWidgetConfiguration()),
            visitedPlaceArrivalTime: getTimeWidgetConfig(this.getArrivalTimeWidgetConfiguration()),
            visitedPlaceDepartureTime: getTimeWidgetConfig(this.getDepartureTimeWidgetConfiguration())
        };
    };
}
