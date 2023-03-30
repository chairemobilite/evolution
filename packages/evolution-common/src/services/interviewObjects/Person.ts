/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ChoicesYesNoDontKnowNonApplicable, ChoiceGender, ChoiceAgeGroup } from '../widgets/choices';
import { ResponseObject } from './ResponseObject';
import { Place } from './Place';
import { Trip } from './Trip';
import { VisitedPlace } from './VisitedPlace';

/**
 * Type the person object, which is used to represent a household member, or any person used during the interview.
 *
 * @export
 * @interface Person
 */
export type Person<CustomPerson, CustomPlace, CustomVisitedPlace, CustomTrip, CustomSegment> = ResponseObject & {
    age?: number;
    ageGroup?: ChoiceAgeGroup; // 5 years gaps age groups
    gender?: ChoiceGender; // female, male or custom
    genderCustom?: string; // if gender choice is set to custom, this is how the person's gender is defined
    nickname?: string;
    driversLicenseOwner?: ChoicesYesNoDontKnowNonApplicable;
    transitPassOwner?: ChoicesYesNoDontKnowNonApplicable;
    usualWorkPlace?: Place<CustomPlace>;
    usualSchoolPlace?: Place<CustomPlace>;
    respondentId?: string; // The uuid of the actual person that responded for the person (proxy). Could be the person themselves.
    // TODO: add more common attributes, according to Pierre-Leo's thesis: https://publications.polymtl.ca/2116/
    visitedPlaces?: {
        [visitedPlaceId: string]: VisitedPlace<CustomVisitedPlace, CustomPlace>;
    };
    trips?: {
        [tripId: string]: Trip<CustomTrip, CustomSegment>;
    };
} & CustomPerson;
