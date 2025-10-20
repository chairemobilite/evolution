/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { isFeature, isPoint } from 'geojson-validation';

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { VisitedPlaceAuditCheckContext, VisitedPlaceAuditCheckFunction } from '../AuditCheckContexts';

export const visitedPlaceAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
    /**
     * Check if visited place geography is missing
     * @param context - VisitedPlaceAuditCheckContext
     * @returns AuditForObject
     */
    VP_M_Geography: (context: VisitedPlaceAuditCheckContext): AuditForObject | undefined => {
        const { visitedPlace } = context;
        const geography = visitedPlace.geography;

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
