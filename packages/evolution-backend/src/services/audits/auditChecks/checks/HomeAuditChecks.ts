/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { isFeature, isPoint } from 'geojson-validation';
import { distance as turfDistance } from '@turf/distance';

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { HomeAuditCheckContext, HomeAuditCheckFunction } from '../AuditCheckContexts';

// Distances are arbitrary. This should only detect distances that could cause
// change in travel behaviour.
// TODO: More research is needed to find better thresholds.
export const MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR = 200;
export const MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING = 50;

const isNotBlankAndValidPoint = (feature: unknown): boolean => {
    // isFeature and isPoint will return false for undefined or null values so no need to check
    return isFeature(feature) && isPoint((feature as GeoJSON.Feature).geometry);
};

export const homeAuditChecks: { [errorCode: string]: HomeAuditCheckFunction } = {
    /**
     * Check if home is missing geography
     * @param context - HomeAuditCheckContext
     * @returns AuditForObject
     */
    HM_M_Geography: (context: HomeAuditCheckContext): AuditForObject | undefined => {
        const { home } = context;
        const geography = home.geography;

        if (!geography) {
            return {
                objectType: 'home',
                objectUuid: home._uuid!,
                errorCode: 'HM_M_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if home has an invalid geography
     * @param context - HomeAuditCheckContext
     * @returns AuditForObject
     */
    HM_I_Geography: (context: HomeAuditCheckContext): AuditForObject | undefined => {
        const { home } = context;
        const geography = home.geography;

        if (geography && !isNotBlankAndValidPoint(geography)) {
            return {
                objectType: 'home',
                objectUuid: home._uuid!,
                errorCode: 'HM_I_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is invalid',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if home has a preGeography and home geography are more than MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR meters apart
     * @param context - HomeAuditCheckContext
     * @returns AuditForObject
     */
    HM_I_preGeographyAndHomeGeographyTooFarApartError: (context: HomeAuditCheckContext): AuditForObject | undefined => {
        const home = context.home;
        const preGeography = home.preGeography;
        const geography = home.geography;
        if (isNotBlankAndValidPoint(preGeography) && isNotBlankAndValidPoint(geography)) {
            const distance = turfDistance(
                preGeography as GeoJSON.Feature<GeoJSON.Point>,
                geography as GeoJSON.Feature<GeoJSON.Point>,
                { units: 'meters' }
            );
            if (distance >= MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR) {
                return {
                    objectType: 'home',
                    objectUuid: home._uuid!,
                    errorCode: 'HM_I_preGeographyAndHomeGeographyTooFarApartError',
                    version: 1,
                    level: 'error',
                    message: 'Pre-filled and declared home geography are far apart',
                    ignore: false
                };
            }
        }
        return undefined;
    },

    /**
     * Check if home has a preGeography and home geography are more than MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING meters apart but less than MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR meters apart
     * See HM_I_preGeographyAndHomeGeographyTooFarApartError for more than MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR meters apart
     * @param context - HomeAuditCheckContext
     * @returns AuditForObject
     */
    HM_I_preGeographyAndHomeGeographyTooFarApartWarning: (
        context: HomeAuditCheckContext
    ): AuditForObject | undefined => {
        const home = context.home;
        const preGeography = home.preGeography;
        const geography = home.geography;
        if (isNotBlankAndValidPoint(preGeography) && isNotBlankAndValidPoint(geography)) {
            const distance = turfDistance(
                preGeography as GeoJSON.Feature<GeoJSON.Point>,
                geography as GeoJSON.Feature<GeoJSON.Point>,
                { units: 'meters' }
            );
            if (distance >= MIN_DISTANCE_PRE_AND_GEOGRAPHY_WARNING && distance < MAX_DISTANCE_PRE_AND_GEOGRAPHY_ERROR) {
                return {
                    objectType: 'home',
                    objectUuid: home._uuid!,
                    errorCode: 'HM_I_preGeographyAndHomeGeographyTooFarApartWarning',
                    version: 1,
                    level: 'warning',
                    message: 'Pre-filled and declared home geography are a bit far apart',
                    ignore: false
                };
            }
        }
        return undefined;
    }
};
