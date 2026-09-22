/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { isFeature, isPoint } from 'geojson-validation';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { StartEndable } from 'evolution-common/lib/services/baseObjects/StartEndable';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import type { VisitedPlaceAuditCheckContext, VisitedPlaceAuditCheckFunction } from '../AuditCheckContexts';

export const visitedPlaceAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
    /**
     * Check if visited place geography is missing.
     * A loop activity visited place has no geography, so this check does not run for it.
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_M_Geography: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace } = context;
        const geography = visitedPlace.geography;

        if (loopActivities.some((loopActivity) => loopActivity === visitedPlace.activity)) {
            return undefined;
        }

        if (!geography) {
            return {
                objectType: 'visitedPlace',
                objectUuid: visitedPlace._uuid!,
                errorCode: 'VP_M_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if visited place activity is missing.
     * `activityCategory` is coarser and does not replace `activity`.
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_M_Activity: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace } = context;

        if (_isBlank(visitedPlace.activity)) {
            return {
                objectType: 'visitedPlace',
                objectUuid: visitedPlace._uuid!,
                errorCode: 'VP_M_Activity',
                version: 1,
                level: 'error',
                message: 'Visited place activity is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if visited place start time (arrival) is missing.
     * The first place of the journey has no arrival. A time period counts.
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_M_StartTime: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace, journey } = context;
        const visitedPlaces = journey.visitedPlaces ?? [];
        const index = visitedPlaces.findIndex((place) => place._uuid === visitedPlace._uuid);

        if (index === 0) {
            return undefined;
        }

        if (StartEndable.hasStart(visitedPlace)) {
            return undefined;
        }

        return {
            objectType: 'visitedPlace',
            objectUuid: visitedPlace._uuid!,
            errorCode: 'VP_M_StartTime',
            version: 1,
            level: 'error',
            message: 'Visited place start time is missing',
            ignore: false
        };
    },

    /**
     * Check if visited place end time (departure) is missing.
     * The last place of the journey has no departure. A time period counts.
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_M_EndTime: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace, journey } = context;
        const visitedPlaces = journey.visitedPlaces ?? [];
        const index = visitedPlaces.findIndex((place) => place._uuid === visitedPlace._uuid);
        const isLast = visitedPlaces.length > 0 && index === visitedPlaces.length - 1;

        if (isLast) {
            return undefined;
        }

        if (StartEndable.hasEnd(visitedPlace)) {
            return undefined;
        }

        return {
            objectType: 'visitedPlace',
            objectUuid: visitedPlace._uuid!,
            errorCode: 'VP_M_EndTime',
            version: 1,
            level: 'error',
            message: 'Visited place end time is missing',
            ignore: false
        };
    },

    /**
     * Check if visited place geography is invalid
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_I_Geography: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace } = context;
        const geography = visitedPlace.geography;

        if (geography && (!isFeature(geography) || !isPoint(geography.geometry))) {
            return {
                objectType: 'visitedPlace',
                objectUuid: visitedPlace._uuid!,
                errorCode: 'VP_I_Geography',
                version: 1,
                level: 'error',
                message: 'Visited place geography is invalid',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
