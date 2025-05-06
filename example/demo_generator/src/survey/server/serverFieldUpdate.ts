/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment-business-days';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { _isBlank, _booleish } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { randomFromDistribution } from 'chaire-lib-common/lib/utils/RandomUtils';
import { getPreFilledResponsesByPath } from 'evolution-backend/lib/services/interviews/serverFieldUpdate';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
import { getTransitSummary } from 'evolution-backend/lib/services/routing';

const assignedDayPath = 'assignedDay';
const originalAssignedDayPath = 'originalAssignedDay';

const ASSIGNED_DAY_UPDATE_FREQ_MINUTES = 15;
let lastCheckMoment = undefined;
const assignedDays = [0, 0, 0, 0, 0, 0, 0];
const assignedDayTarget = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
const defaultProbabilityOfDaysBefore = [0.6, 0.2, 0.13, 0.07];

const getAssignedDayRates = (): number[] | undefined => {
    const total = assignedDays.reduce((sum, current) => sum + current, 0);
    // Do not play with days below 500 surveys
    if (total < 500) {
        return undefined;
    }
    return assignedDays.map((dayCount) => dayCount / total);
};

// Exported so it can be called in unit tests
export const updateAssignedDayRates = async () => {
    console.log('Updating assigned day rates...');
    // Filter completed interviews only and interviews that are not invalid (value can be null or true, so we need to use 'not' false)
    const filters = {
        'responses._isCompleted': { value: true },
        is_valid: { value: false, op: 'not' as const }
    };
    if (lastCheckMoment !== undefined) {
        filters['responses._completedAt'] = { value: Math.ceil(lastCheckMoment.valueOf() / 1000), op: 'gte' };
    }
    const currentCheck = moment();
    lastCheckMoment = currentCheck;
    let interviewCount = 0;
    const queryStream = interviewsDbQueries.getInterviewsStream({
        filters,
        select: { responses: 'validatedIfAvailable', includeAudits: false }
    });
    return new Promise<void>((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const interview = row;
                interviewCount++;

                const assignedDate = getResponse(interview, assignedDayPath);
                if (assignedDate !== undefined) {
                    const momentDay = moment(assignedDate);
                    if (momentDay.isHoliday() && momentDay.isoWeekday() < 6) {
                        // Holiday in a weekday, ignore from count
                        return;
                    }
                    assignedDays[momentDay.isoWeekday() - 1]++;
                }
            })
            .on('end', () => {
                console.log('Updated assigned day rates with the data from %d interviews', interviewCount);
                resolve();
            });
    });
};

const getPrefilledForAccessCode = async (accessCode, interview) => {
    const prefilledResponses = await getPreFilledResponsesByPath(accessCode, interview);
    if (prefilledResponses['home.address'] !== undefined) {
        prefilledResponses['home._addressIsPrefilled'] = true;
    }
    return prefilledResponses;
};

const periodicAssignedDatRatesUpdate = async () => {
    await updateAssignedDayRates();
    setTimeout(periodicAssignedDatRatesUpdate, ASSIGNED_DAY_UPDATE_FREQ_MINUTES * 60 * 1000); // Update every X minutes
};

// To avoid the first query when the server restarts to be long when there's a lot of data, make it run asynchronously now.
try {
    console.log('Calculating assigned day rates for the first time');
    periodicAssignedDatRatesUpdate().then(() => {
        console.log('Assigned day rates at start:', assignedDays.toString());
    });
} catch (error) {
    console.error('Error at first calculation of assigned day rates: ', error);
}

export default [
    {
        field: 'previousDay',
        callback: async (interview, value) => {
            const assignedDay = getResponse(interview, assignedDayPath);
            if (!_isBlank(assignedDay)) {
                // already assigned
                return {};
            }
            try {
                const prevDay = moment(value);
                const dow = prevDay.isoWeekday() - 1;
                const currentDayRates = getAssignedDayRates();
                if (currentDayRates === undefined && assignedDayTarget[dow] !== 0) {
                    return { [assignedDayPath]: value, [originalAssignedDayPath]: value };
                }
                const probabilities = [];
                // Divide target by current rate and put to the power of 3, then multiply by default probability.
                // FIXME Fine-tune if necessary
                for (let i = 0; i < 4; i++) {
                    const dow = !prevDay.isHoliday() ? prevDay.isoWeekday() - 1 : 6;
                    probabilities.push(
                        assignedDayTarget[dow] === 0
                            ? 0
                            : Math.max(
                                  0.01,
                                  Math.pow(
                                      assignedDayTarget[dow] /
                                          Math.max(0.005, currentDayRates === undefined ? 1 : currentDayRates[dow]),
                                      3
                                  )
                              ) *
                                  defaultProbabilityOfDaysBefore[i] *
                                  100
                    );
                    prevDay.subtract(1, 'days');
                }

                const totalProbability = probabilities.reduce((total, prob) => total + prob, 0);
                const daysBeforePrevDay = randomFromDistribution(probabilities, undefined, totalProbability);
                const formattedAssignedDay = (
                    daysBeforePrevDay > 0 ? moment(value).subtract(daysBeforePrevDay, 'days') : moment(value)
                ).format('YYYY-MM-DD');
                return {
                    [assignedDayPath]: formattedAssignedDay,
                    [originalAssignedDayPath]: formattedAssignedDay
                };
            } catch (error) {
                console.error('Error getting the assigned day for survey', error);
                // Error, fallback to previous business day
                return { [assignedDayPath]: value, [originalAssignedDayPath]: value };
            }
        }
    },
    {
        field: 'accessCode',
        callback: async (interview, value) => {
            try {
                if (_isBlank(value) || !validateAccessCode(value)) {
                    return {};
                }
                const trimmedValue = value.replace(' ', '');
                const properlyFormattedAccessCode = `${trimmedValue.substring(0, 4)}-${trimmedValue.substring(
                    trimmedValue.length - 4
                )}`;
                const accessCodeConfirmed = getResponse(interview, 'confirmAccessCode');
                // Get prefilled responses only if the code is already confirmed
                const prefilledResponses =
                    accessCodeConfirmed === 'confirmed'
                        ? await getPrefilledForAccessCode(properlyFormattedAccessCode, interview)
                        : {};
                if (properlyFormattedAccessCode !== value) {
                    prefilledResponses['accessCode'] = properlyFormattedAccessCode;
                }
                return prefilledResponses;
            } catch (error) {
                console.log('error getting server update fields for accessCode', error);
                return {};
            }
        }
    },
    {
        field: 'confirmAccessCode',
        callback: async (interview, value) => {
            try {
                if (value !== 'confirmed') {
                    return {};
                }
                const accessCode = getResponse(interview, 'accessCode');
                if (typeof accessCode !== 'string' || !validateAccessCode(accessCode)) {
                    return { confirmAccessCode: 'invalid' };
                }
                return await getPrefilledForAccessCode(accessCode, interview);
            } catch (error) {
                console.log('error getting server update fields for accessCode', error);
                return {};
            }
        }
    },
    {
        field: { regex: 'household.persons.*.trips.*.segments.*.modePre' },
        runOnValidatedData: true,
        callback: async (interview, value, path, registerUpdateOperation) => {
            const resultPath = surveyHelper.getPath(path, '../trRoutingResult');
            const defaultResponse = { [resultPath]: undefined };
            // If using a public transit mode, retrieve results from trRouting
            if (!['transit'].includes(value) || config.trRoutingScenarios === undefined) {
                return defaultResponse;
            }
            try {
                const visitedPlaces = surveyHelper.getResponse(
                    interview,
                    path,
                    undefined,
                    '../../../../../visitedPlaces'
                );
                const person = surveyHelper.getResponse(interview, path, undefined, '../../../../../');
                const trip = surveyHelper.getResponse(interview, path, undefined, '../../../');
                const householdTripsDate = surveyHelper.getResponse(interview, 'household.tripsDate');
                if (
                    visitedPlaces === undefined ||
                    person === undefined ||
                    trip === undefined ||
                    householdTripsDate === undefined
                ) {
                    return defaultResponse;
                }
                const weekDay = moment(householdTripsDate).day();
                const scenario =
                    weekDay === 0
                        ? config.trRoutingScenarios.DI
                        : weekDay === 6
                          ? config.trRoutingScenarios.SA
                          : config.trRoutingScenarios.SE;
                if (scenario === undefined) {
                    return defaultResponse;
                }

                const originGeography = surveyHelper.getOriginGeography(trip, visitedPlaces, person, interview);
                const destinationGeography = surveyHelper.getDestinationGeography(trip, visitedPlaces, person, interview);
                const origin = surveyHelper.getOrigin(trip, visitedPlaces);
                const timeOfTrip = origin.departureTime;

                registerUpdateOperation({
                    opName: `transitSummary${originGeography.geometry.coordinates[0]}${originGeography.geometry.coordinates[1]}${destinationGeography.geometry.coordinates[0]}${destinationGeography.geometry.coordinates[1]}`,
                    opUniqueId: 1,
                    operation: async (_isCancelled: () => boolean) => {
                        const summaryResponse = await getTransitSummary({
                            origin: originGeography,
                            destination: destinationGeography,
                            transitScenario: scenario,
                            departureSecondsSinceMidnight: timeOfTrip,
                            departureDateString: householdTripsDate,
                            minWaitingTime: 180,
                            maxAccessTravelTime: 20 * 60,
                            maxEgressTravelTime: 20 * 60,
                            maxTransferTravelTime: 20 * 60,
                            maxTravelTime: 180 * 60,
                            maxFirstWaitingTime: 20 * 60
                        } as any);
                        if (summaryResponse.status !== 'success') {
                            console.log('Error getting summary: ', JSON.stringify(summaryResponse));
                        }
                        return { [resultPath]: summaryResponse.status === 'success' ? summaryResponse : undefined };
                    }
                });
                return {};
            } catch (error) {
                console.log('Error occurred while getting summary for transit mode:', error);
                return defaultResponse;
            }
        }
    },
    {
        field: 'acceptToBeContactedForHelp',
        callback: async (interview, value) => {
            // If coming from url, the value will be a string, convert to boolean if so
            if (typeof value === 'string') {
                return { acceptToBeContactedForHelp: _booleish(value) };
            }
            return {};
        }
    }
];
