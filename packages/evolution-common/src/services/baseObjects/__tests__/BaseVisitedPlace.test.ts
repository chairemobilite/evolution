/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseVisitedPlace, BaseVisitedPlaceAttributes, ExtendedVisitedPlaceAttributes } from '../BaseVisitedPlace';
import { BasePlace, BasePlaceAttributes } from '../BasePlace';
import * as VPAttr from '../attributeTypes/VisitedPlaceAttributes';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

const validUUID = uuidV4();

describe('BaseVisitedPlace', () => {

    const geojson = {
        type: 'Feature',
        id: 444,
        geometry: {
            type: 'Point',
            coordinates: [23.5, -11.0033423],
        },
        properties: {
            foo: 'boo2',
            bar: 'far2'
        },
    } as GeoJSON.Feature<GeoJSON.Point, { [key: string]: string }>;

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname5',
        name: 'Sample Weight Method5',
        description: 'Sample weight method description5',
    };

    const basePlaceAttributes: BasePlaceAttributes = {
        _uuid: validUUID,
    };

    const baseVisitedPlaceAttributes: BaseVisitedPlaceAttributes = {
        _uuid: validUUID,
        arrivalDate: new Date('2023-10-05'),
        departureDate: new Date('2023-10-06'),
        arrivalTime: 36000, // 10:00 AM in seconds since midnight
        departureTime: 45000, // 12:30 PM in seconds since midnight
        activityCategory: 'school' as VPAttr.ActivityCategory,
        activity: 'schoolOther' as VPAttr.Activity,
        _weight: { weight: 0.9911, method: new WeightMethod(weightMethodAttributes) },
    };

    const basePlace = new BasePlace(geojson, basePlaceAttributes);

    it('should create a new BaseVisitedPlace instance', () => {
        const visitedPlace = new BaseVisitedPlace(basePlace, baseVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
        expect(visitedPlace._uuid).toEqual(validUUID);
        expect(visitedPlace.place).toBeInstanceOf(BasePlace);
        expect(visitedPlace.place.geography?.type).toEqual('Feature');
        expect(visitedPlace.place.geography?.geometry?.type).toEqual('Point');
        expect(visitedPlace.place.geography?.geometry?.coordinates).toEqual([23.5, -11.0033423]);
        expect(visitedPlace.place.geography?.properties).toEqual({ foo: 'boo2', bar: 'far2' });
        expect(visitedPlace.place.geography?.id).toEqual(444);
        expect(visitedPlace.arrivalDate).toEqual(new Date('2023-10-05'));
        expect(visitedPlace.departureDate).toEqual(new Date('2023-10-06'));
        expect(visitedPlace.arrivalTime).toEqual(36000);
        expect(visitedPlace.departureTime).toEqual(45000);
        expect(visitedPlace.activityCategory).toEqual('school');
        expect(visitedPlace.activity).toEqual('schoolOther');
    });

    it('should create a new BaseVisitedPlace instance with minimal attributes', () => {
        const minimalBasePlaceAttributes: BasePlaceAttributes = {
            _uuid: validUUID,
            name: 'Minimal Test Place',
        };

        const minimalVisitedPlaceAttributes: BaseVisitedPlaceAttributes = {
            _uuid: validUUID,
            activityCategory: 'home' as VPAttr.ActivityCategory,
            activity: 'home' as VPAttr.Activity,
        };

        const visitedPlace = new BaseVisitedPlace(new BasePlace(undefined, minimalBasePlaceAttributes), minimalVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
        expect(visitedPlace._uuid).toEqual(validUUID);
        expect(visitedPlace.place).toBeInstanceOf(BasePlace);
        expect(visitedPlace.place.geography).toBeUndefined();
        expect(visitedPlace.place.name).toEqual('Minimal Test Place');
        expect(visitedPlace.arrivalDate).toBeUndefined();
        expect(visitedPlace.departureDate).toBeUndefined();
        expect(visitedPlace.arrivalTime).toBeUndefined();
        expect(visitedPlace.departureTime).toBeUndefined();
        expect(visitedPlace.activityCategory).toEqual('home');
        expect(visitedPlace.activity).toEqual('home');
    });

    it('should validate a BaseVisitedPlace instance', () => {
        const visitedPlace = new BaseVisitedPlace(new BasePlace(undefined, {} as BasePlaceAttributes), baseVisitedPlaceAttributes);
        expect(visitedPlace.isValid()).toBeUndefined();
        const validationResult = visitedPlace.validate();
        expect(validationResult).toBe(true);
        expect(visitedPlace.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedVisitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
            ...baseVisitedPlaceAttributes,
            customAttribute: 'Custom Value',
        };

        const visitedPlace = new BaseVisitedPlace(new BasePlace(undefined, {} as BasePlaceAttributes), extendedVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(BaseVisitedPlace);
    });

    it('should set weight and method correctly', () => {
        const visitedPlace = new BaseVisitedPlace(new BasePlace(undefined, {} as BasePlaceAttributes), baseVisitedPlaceAttributes);
        const weight: Weight = visitedPlace._weight as Weight;
        expect(weight.weight).toBe(.9911);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname5');
        expect(weight.method.name).toEqual('Sample Weight Method5');
        expect(weight.method.description).toEqual('Sample weight method description5');
    });
});
