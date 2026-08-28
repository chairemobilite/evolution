/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from '../../../config/project.config';
import * as surveyHelperNew from '../../../utils/helpers';
import type { ValidationFunction } from '../../questionnaire/types';

type HouseholdAssetCountMessageKeys = {
    invalid: string;
    required: string;
    minZero: string;
    overMax: string;
};

const getMaxHouseholdAssetCount = (householdSize: number, maxPerPerson: number): number => householdSize * maxPerPerson;

/**
 * Household size used for asset count upper bounds.
 * Falls back to {@link projectConfig.maxHouseholdSize} when size is unknown or invalid.
 * @param householdSize number of people in the household, if known
 */
const getEffectiveHouseholdSizeForAssetCount = (householdSize: number | undefined): number => {
    if (householdSize !== undefined && Number.isInteger(householdSize) && householdSize > 0) {
        return householdSize;
    }

    return projectConfig.maxHouseholdSize;
};

/**
 * Whether a household asset count is invalid for audits and server-side checks.
 * @param value asset count on the household
 * @param householdSize number of people in the household
 * @param maxPerPerson maximum count allowed per household member
 */
const isHouseholdAssetCountInvalid = (
    value: number | undefined,
    householdSize: number | undefined,
    maxPerPerson: number
): boolean => {
    if (value === undefined) {
        return false;
    }

    if (!Number.isInteger(value) || value < 0) {
        return true;
    }

    return value > getMaxHouseholdAssetCount(getEffectiveHouseholdSizeForAssetCount(householdSize), maxPerPerson);
};

const getHouseholdSizeFromInterview = (interview: Parameters<ValidationFunction>[2]): number | undefined => {
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', undefined);
    if (_isBlank(householdSize) || isNaN(Number(householdSize)) || typeof householdSize !== 'number') {
        return undefined;
    }

    return householdSize;
};

/**
 * Build a widget validation for a household asset count (cars, bicycles, two-wheelers).
 * The upper bound is household size (or maxHouseholdSize when size is unknown) × maxPerPerson.
 *
 * Widgets should define a `conditional` that hides the asset input until `household.size`
 * is completed and valid (integer ≥ 1), so participants answer household size first.
 *
 * @param maxPerPerson maximum count allowed per household member
 * @param messageKeys i18n keys under `survey:errors` for validation messages
 */
const createHouseholdAssetCountValidation = (
    maxPerPerson: number,
    messageKeys: HouseholdAssetCountMessageKeys
): ValidationFunction => {
    return (value, _customValue, interview, _path, _customPath) => {
        const householdSize = getHouseholdSizeFromInterview(interview);
        const maxTotal = getMaxHouseholdAssetCount(getEffectiveHouseholdSizeForAssetCount(householdSize), maxPerPerson);

        return [
            {
                validation: _isBlank(value),
                errorMessage: (t) => t(messageKeys.required)
            },
            {
                validation: !_isBlank(value) && (isNaN(Number(value)) || !Number.isInteger(Number(value))),
                errorMessage: (t) => t(messageKeys.invalid)
            },
            {
                validation: !_isBlank(value) && !isNaN(Number(value)) && Number(value) < 0,
                errorMessage: (t) => t(messageKeys.minZero)
            },
            {
                validation: !_isBlank(value) && !isNaN(Number(value)) && Number(value) > maxTotal,
                errorMessage: (t) => t(messageKeys.overMax, { maxPerPerson })
            }
        ];
    };
};

/** @see {@link ValidationFunction} */
export const carNumberValidation = createHouseholdAssetCountValidation(
    projectConfig.vehicles.maxCarsPerHouseholdMember,
    {
        invalid: 'survey:errors:carNumberInvalid',
        required: 'survey:errors:carNumberRequired',
        minZero: 'survey:errors:carNumberMinZero',
        overMax: 'survey:errors:carNumberOverMax'
    }
);

/** @see {@link ValidationFunction} */
export const bicycleNumberValidation = createHouseholdAssetCountValidation(
    projectConfig.vehicles.maxBicyclesPerHouseholdMember,
    {
        invalid: 'survey:errors:bicycleNumberInvalid',
        required: 'survey:errors:bicycleNumberRequired',
        minZero: 'survey:errors:bicycleNumberMinZero',
        overMax: 'survey:errors:bicycleNumberOverMax'
    }
);

/** @see {@link ValidationFunction} */
export const twoWheelNumberValidation = createHouseholdAssetCountValidation(
    projectConfig.vehicles.maxTwoWheelsPerHouseholdMember,
    {
        invalid: 'survey:errors:twoWheelNumberInvalid',
        required: 'survey:errors:twoWheelNumberRequired',
        minZero: 'survey:errors:twoWheelNumberMinZero',
        overMax: 'survey:errors:twoWheelNumberOverMax'
    }
);

/** Whether car number fails participant validation rules for the given household size. */
export const isCarNumberInvalid = (carNumber: number | undefined, householdSize: number | undefined): boolean =>
    isHouseholdAssetCountInvalid(carNumber, householdSize, projectConfig.vehicles.maxCarsPerHouseholdMember);

/** Whether two-wheel number fails participant validation rules for the given household size. */
export const isTwoWheelNumberInvalid = (
    twoWheelNumber: number | undefined,
    householdSize: number | undefined
): boolean =>
    isHouseholdAssetCountInvalid(twoWheelNumber, householdSize, projectConfig.vehicles.maxTwoWheelsPerHouseholdMember);

/** Whether bicycle number fails participant validation rules for the given household size. */
export const isBicycleNumberInvalid = (bicycleNumber: number | undefined, householdSize: number | undefined): boolean =>
    isHouseholdAssetCountInvalid(bicycleNumber, householdSize, projectConfig.vehicles.maxBicyclesPerHouseholdMember);
