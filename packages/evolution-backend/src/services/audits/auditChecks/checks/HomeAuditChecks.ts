/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { HomeAuditCheckContext, HomeAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Home-specific audit check functions
 */
export const homeAuditChecks: { [errorCode: string]: HomeAuditCheckFunction } = {
    /**
     * Check if home has missing or invalid geographic coordinates
     */
    HM_M_Geography: (context: HomeAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { home } = context;
        const geography = home.geography;

        if (!geography) {
            return {
                version: 1,
                level: 'warning',
                message: 'Home geography is missing',
                ignore: false
            };
        }

        if (geography.type === 'Feature' && geography.geometry?.type === 'Point') {
            const coordinates = geography.geometry.coordinates;
            if (!coordinates || coordinates.length !== 2) {
                return {
                    version: 1,
                    level: 'error',
                    message: 'Home coordinates are invalid',
                    ignore: false
                };
            }
        }

        return undefined; // No audit needed
    },

    /**
     * Check if home has missing UUID
     */
    HM_M_Uuid: (context: HomeAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { home } = context;
        const hasUuid = !!home._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Home UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
