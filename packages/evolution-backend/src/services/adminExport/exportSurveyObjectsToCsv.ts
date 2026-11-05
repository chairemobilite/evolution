/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import config from 'evolution-common/lib/config/project.config';
import type { ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import interviewsDbQueries from '../../models/interviews.db.queries';
import reviewDecisionsDbQueries from '../../models/reviewDecisions.db.queries';
import { computeReviewDecisionStatusForObject } from '../reviews/ReviewDecisionUtils';
import { SurveyObjectsFactory } from '../surveyObjects/SurveyObjectsFactory';
import { execJob } from '../../tasks/serverWorkerPool';
import { CsvExportVisitor } from './CsvExportVisitor';
import { filePathOnServer } from './exportAllResponsesToCsvByObject';

/**
 * Task to export the survey objects of all interviews with a corrected
 * response to one CSV file per object type, with the review status of each
 * object. Objects that could not be created from the corrected response
 * (invalid parameters) are not exported, nor are their children.
 *
 * NOTE: THIS SHOULD ONLY BE CALLED FROM A WORKERPOOL OR TASKS, NOT THE MAIN
 * THREAD, as the survey objects are created with the survey's parsers, which
 * are loaded in the workers.
 *
 * @returns {Promise<string[]>} The names of the CSV files, in the export directory
 */
export const exportSurveyObjectsToCsvTask = async (): Promise<string[]> => {
    // Review decisions of the interview being exported
    let reviewDecisions: ReviewDecision[] = [];
    const visitor = new CsvExportVisitor(
        filePathOnServer,
        `surveyObjects_${config.projectShortname}`,
        (objectType, objectUuid) =>
            computeReviewDecisionStatusForObject(reviewDecisions, objectType, objectUuid).effectiveStatus
    );
    // Routing is not exported, no need to calculate it
    const factory = new SurveyObjectsFactory({ calculateRouting: false });
    const interviewStream = interviewsDbQueries.getInterviewsStream({
        filters: {},
        select: { includeAudits: false, responseType: 'corrected' }
    });
    // Async iteration pauses the database stream while each interview is exported
    for await (const interview of interviewStream) {
        if (!interview.corrected_response) {
            continue;
        }
        reviewDecisions = await reviewDecisionsDbQueries.getReviewDecisionsForInterview(interview.id);
        const surveyObjects = await factory.createAllObjectsWithErrors(interview as InterviewAttributes);
        await walkSurveyObjects(surveyObjects, visitor);
    }
    const fileNames = await visitor.finish();
    console.log('All survey objects exported');
    return fileNames;
};

let runningExportNonce: undefined | object = undefined;

/**
 * Run the task exporting the survey objects to CSV in the worker pool. The
 * export status can be followed using {@link isSurveyObjectsExportRunning}.
 *
 * @returns {'alreadyRunning' | 'exportStarted'} Whether the export was started
 */
export const exportSurveyObjectsToCsv = (): 'alreadyRunning' | 'exportStarted' => {
    if (runningExportNonce !== undefined) {
        return 'alreadyRunning';
    }
    runningExportNonce = new Object();
    execJob('exportSurveyObjectsToCsv', [])
        .then(() => console.log('Survey objects export completed'))
        .catch((error) => console.log('Survey objects export failed:', error))
        .then(() => {
            runningExportNonce = undefined;
        });
    return 'exportStarted';
};

/** @returns {boolean} Whether the survey objects export is running */
export const isSurveyObjectsExportRunning = (): boolean => runningExportNonce !== undefined;
