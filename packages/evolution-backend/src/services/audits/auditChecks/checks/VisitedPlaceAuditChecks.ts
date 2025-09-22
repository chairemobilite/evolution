/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { VisitedPlaceAuditCheckContext, VisitedPlaceAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * VisitedPlace-specific audit check functions
 */
export const visitedPlaceAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
    /**
     * Check if visited place has missing or invalid geographic coordinates
     */
    VP_M_Geography: (context: VisitedPlaceAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { visitedPlace } = context;
        const geography = visitedPlace.geography;

        if (!geography) {
            return {
                version: 1,
                level: 'warning',
                message: 'Visited place geography is missing',
                ignore: false
            };
        }

        if (geography.type === 'Feature' && geography.geometry?.type === 'Point') {
            const coordinates = geography.geometry.coordinates;
            if (!coordinates || coordinates.length !== 2) {
                return {
                    version: 1,
                    level: 'error',
                    message: 'Visited place coordinates are invalid',
                    ignore: false
                };
            }
        }

        return undefined; // No audit needed
    },

    /**
     * Check if visited place has missing UUID
     */
    VP_M_Uuid: (context: VisitedPlaceAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { visitedPlace } = context;
        const hasUuid = !!visitedPlace._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Visited place UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
