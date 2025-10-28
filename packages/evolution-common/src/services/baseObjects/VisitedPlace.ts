/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Optional } from '../../types/Optional.type';
import { PreData } from '../../types/shared';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Place, ExtendedPlaceAttributes, SerializedExtendedPlaceAttributes } from './Place';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Address } from './Address';
import { Journey } from './Journey';
import { Person } from './Person';
import { Household } from './Household';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';

export const visitedPlaceAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
    'activity',
    'activityCategory',
    'shortcut',
    'preData'
];

export const visitedPlaceAttributesWithComposedAttributes = [...visitedPlaceAttributes, '_place'];

type VisitedPlaceUuid = string;

export type VisitedPlaceAttributes = {
    /**
     * Sequence number for ordering nested composed objects.
     * NOTE: This will be removed when we use objects directly inside the interview process.
     * Right now, since nested composed objects are still using objects with uuid as key,
     * they need a _sequence attribute to be able to order them.
     */
    _sequence?: Optional<number>;
    activity?: Optional<VPAttr.Activity>;
    activityCategory?: Optional<VPAttr.ActivityCategory>;
    /** UUID of another visited place that this place references as a shortcut */
    shortcut?: Optional<VisitedPlaceUuid>;
    preData?: Optional<PreData>;
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type VisitedPlaceWithComposedAttributes = VisitedPlaceAttributes & {
    _place?: Optional<ExtendedPlaceAttributes>;
};

export type ExtendedVisitedPlaceAttributes = VisitedPlaceWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedVisitedPlaceAttributes = {
    _attributes?: ExtendedVisitedPlaceAttributes;
    _customAttributes?: { [key: string]: unknown };
    _place?: SerializedExtendedPlaceAttributes;
};

/**
 * A visited place is a location that has been visited during a trip/journey
 * and that has an activity.
 * It could be home, a work place, a school place, a restaurant, a place of leisure,
 * a shopping place, etc.
 */
export class VisitedPlace extends Uuidable implements IValidatable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: VisitedPlaceAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _place?: Optional<Place>;
    private _journeyUuid?: Optional<string>;

    static _confidentialAttributes = ['preData'];

    constructor(params: ExtendedVisitedPlaceAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {} as VisitedPlaceAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_place', '_journeyUuid']),
            visitedPlaceAttributes,
            visitedPlaceAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.place = ConstructorUtils.initializeComposedAttribute(
            params._place,
            Place.unserialize,
            this._surveyObjectsRegistry
        );
        this.journeyUuid = params._journeyUuid as Optional<string>;

        this._surveyObjectsRegistry.registerVisitedPlace(this);
    }

    get attributes(): VisitedPlaceAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    get _isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get _weights(): Optional<Weight[]> {
        return this._attributes._weights;
    }

    set _weights(value: Optional<Weight[]>) {
        this._attributes._weights = value;
    }

    get _sequence(): Optional<number> {
        return this._attributes._sequence;
    }

    set _sequence(value: Optional<number>) {
        this._attributes._sequence = value;
    }

    get place(): Optional<Place> {
        return this._place;
    }

    set place(value: Optional<Place>) {
        this._place = value;
    }

    get startDate(): Optional<string> {
        return this._attributes.startDate;
    }

    set startDate(value: Optional<string>) {
        this._attributes.startDate = value;
    }

    get startTime(): Optional<number> {
        return this._attributes.startTime;
    }

    set startTime(value: Optional<number>) {
        this._attributes.startTime = value;
    }

    get startTimePeriod(): Optional<TimePeriod> {
        return this._attributes.startTimePeriod;
    }

    set startTimePeriod(value: Optional<TimePeriod>) {
        this._attributes.startTimePeriod = value;
    }

    get endDate(): Optional<string> {
        return this._attributes.endDate;
    }

    set endDate(value: Optional<string>) {
        this._attributes.endDate = value;
    }

    get endTime(): Optional<number> {
        return this._attributes.endTime;
    }

    set endTime(value: Optional<number>) {
        this._attributes.endTime = value;
    }

    get endTimePeriod(): Optional<TimePeriod> {
        return this._attributes.endTimePeriod;
    }

    set endTimePeriod(value: Optional<TimePeriod>) {
        this._attributes.endTimePeriod = value;
    }

    get activity(): Optional<VPAttr.Activity> {
        return this._attributes.activity;
    }

    set activity(value: Optional<VPAttr.Activity>) {
        this._attributes.activity = value;
    }

    get activityCategory(): Optional<VPAttr.ActivityCategory> {
        return this._attributes.activityCategory;
    }

    set activityCategory(value: Optional<VPAttr.ActivityCategory>) {
        this._attributes.activityCategory = value;
    }

    get geography(): Optional<GeoJSON.Feature<GeoJSON.Point>> {
        return this._place?.geography;
    }

    get name(): Optional<string> {
        return this._place?.name;
    }

    get address(): Optional<Address> {
        return this._place?.address;
    }

    /**
     * UUID of another visited place that this place references as a shortcut.
     * Can be empty if no shortcut is defined.
     */
    get shortcut(): Optional<string> {
        return this._attributes.shortcut;
    }

    set shortcut(value: Optional<string>) {
        this._attributes.shortcut = value;
    }

    get preData(): Optional<PreData> {
        return this._attributes.preData;
    }

    set preData(value: Optional<PreData>) {
        this._attributes.preData = value;
    }

    get journeyUuid(): Optional<string> {
        return this._journeyUuid;
    }

    set journeyUuid(value: Optional<string>) {
        this._journeyUuid = value;
    }

    get journey(): Optional<Journey> {
        if (!this._journeyUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getJourney(this._journeyUuid);
    }

    get person(): Optional<Person> {
        return this.journey?.person;
    }

    get household(): Optional<Household> {
        return this.person?.household;
    }

    /**
     * Creates a VisitedPlace object from sanitized parameters
     * @param {ExtendedVisitedPlaceAttributes | SerializedExtendedVisitedPlaceAttributes} params - Sanitized visited place parameters
     * @returns {VisitedPlace} New VisitedPlace instance
     */
    static unserialize(
        params: ExtendedVisitedPlaceAttributes | SerializedExtendedVisitedPlaceAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): VisitedPlace {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new VisitedPlace(flattenedParams as ExtendedVisitedPlaceAttributes, surveyObjectsRegistry);
    }

    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<VisitedPlace> {
        const errors = VisitedPlace.validateParams(dirtyParams);
        const visitedPlace = errors.length === 0 ? new VisitedPlace(dirtyParams, surveyObjectsRegistry) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(visitedPlace as VisitedPlace);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'VisitedPlace'): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isRecord('params', dirtyParams, displayName));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid:
        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        // Validate StartEndable attributes:
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        // Validate _sequence:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

        // Validate visited place specific attributes:
        errors.push(...ParamsValidatorUtils.isString('activity', dirtyParams.activity, displayName));
        errors.push(...ParamsValidatorUtils.isString('activityCategory', dirtyParams.activityCategory, displayName));
        errors.push(...ParamsValidatorUtils.isUuid('shortcut', dirtyParams.shortcut, displayName));

        errors.push(...ParamsValidatorUtils.isRecord('preData', dirtyParams.preData, displayName, false));

        // forbid self-reference when both UUIDs are present
        if (
            typeof dirtyParams._uuid === 'string' &&
            typeof dirtyParams.shortcut === 'string' &&
            dirtyParams._uuid === dirtyParams.shortcut
        ) {
            errors.push(new Error(`${displayName} validateParams: shortcut cannot reference itself`));
        }

        // Validate composed place:
        const placeAttributes = dirtyParams._place as { [key: string]: unknown };
        if (placeAttributes) {
            errors.push(...Place.validateParams(placeAttributes, 'VisitedPlace Place'));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_journeyUuid', dirtyParams._journeyUuid, displayName));

        return errors;
    }
}
