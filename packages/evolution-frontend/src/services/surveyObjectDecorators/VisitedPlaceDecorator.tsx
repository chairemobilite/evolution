/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React from 'react';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import i18n from '../../config/i18n.config';

/**
 * Frontend decorator for VisitedPlace that adds display and formatting methods
 * This decorator wraps a VisitedPlace instance and provides additional methods
 * that are only available in the frontend and can use i18n functionality.
 */
export class VisitedPlaceDecorator {
    private readonly visitedPlace: VisitedPlace;

    constructor(visitedPlace: VisitedPlace) {
        this.visitedPlace = visitedPlace;
    }

    /**
     * Get the visited place description
     * @param withTimes Whether to add the times to the description
     * @param allowHtml Whether the description can contain HTML characters
     * @returns Formatted description string or JSX element
     */
    getDescription(withTimes: boolean = false): string | React.ReactElement {
        let times = '';
        if (withTimes) {
            const startTime =
                this.visitedPlace.startTime !== undefined
                    ? ' ' + secondsSinceMidnightToTimeStr(this.visitedPlace.startTime)
                    : '';
            const endTime =
                this.visitedPlace.endTime !== undefined
                    ? ' -> ' + secondsSinceMidnightToTimeStr(this.visitedPlace.endTime)
                    : '';
            times = startTime + endTime;
        }

        const activityLabel = i18n.t(`survey:visitedPlace:activities:${this.visitedPlace.activity}`);

        if (this.visitedPlace.name) {
            // Return JSX element when HTML is requested and name exists
            return (
                <span>
                    {activityLabel} • <em>{this.visitedPlace.name}</em>
                    {times}
                </span>
            );
        } else {
            // Return plain string
            const nameLabel = this.visitedPlace.name ? ` • ${this.visitedPlace.name}` : '';
            return `${activityLabel}${nameLabel}${times}`;
        }
    }

    /**
     * Get formatted start time string
     * @returns Formatted start time or empty string if not set
     */
    getFormattedStartTime(): string {
        return this.visitedPlace.startTime !== undefined
            ? secondsSinceMidnightToTimeStr(this.visitedPlace.startTime)
            : '';
    }

    /**
     * Get formatted end time string
     * @returns Formatted end time or empty string if not set
     */
    getFormattedEndTime(): string {
        return this.visitedPlace.endTime !== undefined ? secondsSinceMidnightToTimeStr(this.visitedPlace.endTime) : '';
    }
}
