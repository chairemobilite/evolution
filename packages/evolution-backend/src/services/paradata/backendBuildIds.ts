/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { BuildId } from 'evolution-common/lib/services/baseObjects/attributeTypes/InterviewParadataAttributes';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { appendBuildIdIfChanged } from 'evolution-common/lib/services/paradata/appendBuildIdIfChanged';
import { getBackendBuildId } from '../../config/buildId';
import interviewsDbQueries from '../../models/interviews.db.queries';

export const PARTICIPANT_BACKEND_BUILD_IDS_PATH = 'response._backendBuildIds';
export const REVIEW_BACKEND_BUILD_IDS_PATH = 'corrected_response._reviewBackendBuildIds';

/**
 * Append the current backend build id when it changed.
 * @param existingBuildIds current build id history
 */
export const appendCurrentBackendBuildIdIfChanged = (existingBuildIds: BuildId[] | undefined): BuildId[] | undefined =>
    appendBuildIdIfChanged(existingBuildIds, getBackendBuildId());

/**
 * Build a valuesByPath patch for a build id history field.
 * @param path dot-separated path to the build id array on the interview
 * @param existingBuildIds current build id history
 */
export const getBuildIdsValuesByPath = (
    path: string,
    existingBuildIds: BuildId[] | undefined
): { [path: string]: BuildId[] } => {
    const updatedBuildIds = appendCurrentBackendBuildIdIfChanged(existingBuildIds);
    if (!updatedBuildIds) {
        return {};
    }

    return { [path]: updatedBuildIds };
};

/** @param existingBackendBuildIds current backend build id history on response */
export const getParticipantBackendBuildIdsValuesByPath = (
    existingBackendBuildIds: BuildId[] | undefined
): { [path: string]: BuildId[] } =>
    getBuildIdsValuesByPath(PARTICIPANT_BACKEND_BUILD_IDS_PATH, existingBackendBuildIds);

/** @param existingReviewBackendBuildIds current review backend build id history on corrected_response */
export const getReviewBackendBuildIdsValuesByPath = (
    existingReviewBackendBuildIds: BuildId[] | undefined
): { [path: string]: BuildId[] } =>
    getBuildIdsValuesByPath(REVIEW_BACKEND_BUILD_IDS_PATH, existingReviewBackendBuildIds);

/**
 * Append the current admin backend build id to corrected_response when it changed.
 * @param interview interview with corrected_response to update in memory
 * @returns true when corrected_response was updated
 */
export const applyReviewBackendBuildIdToInterview = (interview: InterviewAttributes): boolean => {
    const updatedReviewBackendBuildIds = appendCurrentBackendBuildIdIfChanged(
        interview.corrected_response?._reviewBackendBuildIds
    );
    if (!updatedReviewBackendBuildIds) {
        return false;
    }

    interview.corrected_response = interview.corrected_response || {};
    interview.corrected_response._reviewBackendBuildIds = updatedReviewBackendBuildIds;
    return true;
};

/**
 * Persist review backend build id history on corrected_response when it changed.
 * Best-effort: the stamp is traceability paradata, so persistence failures are logged and never
 * thrown, to avoid failing an otherwise successful request (a missed stamp will be recorded on
 * the next review access anyway).
 * @param interview interview to update
 */
export const persistReviewBackendBuildId = async (interview: InterviewAttributes): Promise<void> => {
    if (!applyReviewBackendBuildIdToInterview(interview)) {
        return;
    }

    try {
        await interviewsDbQueries.update(interview.uuid, { corrected_response: interview.corrected_response });
    } catch (error) {
        console.error(`Failed to persist review backend build id for interview ${interview.uuid}:`, error);
    }
};
