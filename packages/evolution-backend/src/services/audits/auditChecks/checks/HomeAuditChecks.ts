/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { isFeature, isPoint } from 'geojson-validation';

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { HomeAuditCheckContext, HomeAuditCheckFunction } from '../AuditCheckContexts';

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

        if (geography && (!isFeature(geography) || !isPoint(geography.geometry))) {
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
    }
};
