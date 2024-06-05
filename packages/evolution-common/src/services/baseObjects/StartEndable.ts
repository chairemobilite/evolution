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

        displayName  = displayName ? displayName + ' StartEndable' : 'StartEndable';

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
}
