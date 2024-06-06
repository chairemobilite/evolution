/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { TimePeriod } from './attributeTypes/GenericAttributes';

export const startEndDateAndTimesAttributes = [
    'startDate',
    'startTime',
    'startTimePeriod',
    'endDate',
    'endTime',
    'endTimePeriod',
] as const;

export type StartEndDateAndTimesAttributes = {
    startDate?: Optional<string>;
    startTime?: Optional<number>;
    startTimePeriod?: Optional<TimePeriod>;
    endDate?: Optional<string>;
    endTime?: Optional<number>;
    endTimePeriod?: Optional<TimePeriod>;
}

/**
 * A StartEndable is an object that has
 * a start and a end datetime and/or time period
 */
export class StartEndable {

    /**
     * validates provided start and end date and time params
     * @param dirtyParams the params input
     * @param displayName the name of the object being validated
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: any }, displayName?: string): Error[] {
        const errors: Error[] = [];

        displayName = displayName ? displayName + ' StartEndable' : 'StartEndable';

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'startDate',
                dirtyParams.startDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'startTime',
                dirtyParams.startTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'startTimePeriod',
                dirtyParams.startTimePeriod,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'endDate',
                dirtyParams.endDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'endTime',
                dirtyParams.endTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'endTimePeriod',
                dirtyParams.endTimePeriod,
                displayName
            )
        );
        return errors;
    }

    /**
     * checks if the start and end times are valid and coherent (end > start)
     * @param startEndable the start endable object
     * @returns true if the times are valid, false if not, undefined if the times are undefined
     */
    static timesAreValid<T extends StartEndDateAndTimesAttributes>(startEndable?: Optional<T>): Optional<boolean> {
        if (startEndable === undefined || startEndable.startTime === undefined || startEndable.endTime === undefined) {
            return undefined;
        }
        // times must numbers and be >= 0
        if (
            typeof startEndable.startTime !== 'number' ||
            typeof startEndable.endTime !== 'number' ||
            isNaN(startEndable.startTime) ||
            isNaN(startEndable.endTime) ||
            startEndable.startTime < 0 ||
            startEndable.endTime < 0
        ) {
            return false;
        }
        // if dates are set: make sure times are valid with dates:
        if (startEndable.startDate && startEndable.endDate) {
            // convert JS date timestamp to seconds (it is in milliseconds)
            const startTimestamp = new Date(startEndable.startDate).getTime() / 1000 + startEndable.startTime;
            const endTimestamp = new Date(startEndable.endDate).getTime() / 1000 + startEndable.endTime;
            return startTimestamp <= endTimestamp;
        } else {
            // if no dates are set, make sure times are coherent
            return startEndable.startTime <= startEndable.endTime;
        }
    }

    /**
     * Get the duration of the object in seconds
     * endTime must be >= startTime and both must exist
     * @returns {Optional<number>} - Returns the duration in seconds, or undefined if no start or end time
     */
    static getDurationSeconds<T extends StartEndDateAndTimesAttributes>(startEndable?: Optional<T>): Optional<number> {
        if (
            startEndable &&
            startEndable.startTime !== undefined &&
            startEndable.endTime !== undefined &&
            this.timesAreValid(startEndable)
        ) {
            if (startEndable.startDate && startEndable.endDate) {
                // convert JS date timestamp to seconds (it is in milliseconds)
                const startTimestamp = new Date(startEndable.startDate).getTime() / 1000 + startEndable.startTime;
                const endTimestamp = new Date(startEndable.endDate).getTime() / 1000 + startEndable.endTime;
                return endTimestamp - startTimestamp;
            } else {
                const startTimestamp = startEndable.startTime;
                const endTimestamp = startEndable.endTime;
                return endTimestamp - startTimestamp;
            }
        }
        return undefined;
    }

}
