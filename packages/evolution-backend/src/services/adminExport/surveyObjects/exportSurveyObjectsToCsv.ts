/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import config from 'evolution-common/lib/config/project.config';
import interviewsDbQueries from '../../../models/interviews.db.queries';
import reviewDecisionsDbQueries from '../../../models/reviewDecisions.db.queries';
import { SurveyObjectsFactory } from '../../surveyObjects/SurveyObjectsFactory';
import { execJob } from '../../../tasks/serverWorkerPool';
import { filePathOnServer } from '../exportAllResponsesToCsvByObject';
import { CsvExportVisitor, leadingColumns } from './CsvExportVisitor';
import { SurveyObjectsCsvWriter } from './SurveyObjectsCsvWriter';
import { hasSurveyObjectCreationErrors } from './hasSurveyObjectCreationErrors';
import { ReviewStatusVisitor } from './ReviewStatusVisitor';

/**
 * Task to export the survey objects of all interviews with a corrected
 * response to one CSV file per object type, with the review of each object.
 *
 * The corrected response exists once an interview was audited, when opened
 * for review or by the batch audit. This task does not create it, so that an
 * export never writes to the database: interviews never audited are not
 * exported.
 *
 * Interviews with at least one survey object that could not be created from
 * the corrected response (invalid parameters) are not exported either. The
 * factory leaves these objects and their children out, so the exported
 * interview would miss them without anything telling it.
 *
 * The survey objects of each interview are walked twice: a
 * {@link ReviewStatusVisitor} first computes the review of each object from
 * the review decisions of the interview, as it depends on the whole tree,
 * then a {@link CsvExportVisitor} writes the rows with these reviews.
 *
 * NOTE: THIS SHOULD ONLY BE CALLED FROM A WORKERPOOL OR TASKS, NOT THE MAIN
 * THREAD, as the survey objects are created with the survey's parsers, which
 * are loaded in the workers.
 *
 * @returns {Promise<string[]>} The names of the CSV files, in the export directory
 */
export const exportSurveyObjectsToCsvTask = async (): Promise<string[]> => {
    const writer = new SurveyObjectsCsvWriter({
        outputDirectory: filePathOnServer,
        fileNamePrefix: `surveyObjects_${config.projectShortname}`,
        leadingColumns
    });
    try {
        // The export does not need the routing of the trips
        const factory = new SurveyObjectsFactory({ calculateRouting: false });
        const interviewStream = interviewsDbQueries.getInterviewsStream({
            filters: {},
            select: { includeAudits: false, responseType: 'corrected' }
        });
        let excludedInterviewsCount = 0;
        // Async iteration pauses the database stream while each interview is exported
        for await (const interview of interviewStream) {
            if (!interview.corrected_response) {
                continue;
            }
            const surveyObjects = await factory.createAllObjectsWithErrors(interview);
            if (hasSurveyObjectCreationErrors(surveyObjects.errorsByObject)) {
                excludedInterviewsCount++;
                continue;
            }
            const reviewStatuses = new ReviewStatusVisitor(
                await reviewDecisionsDbQueries.getReviewDecisionsForInterview(interview.id)
            );
            await walkSurveyObjects(surveyObjects, reviewStatuses);
            await walkSurveyObjects(surveyObjects, new CsvExportVisitor(writer, reviewStatuses));
        }
        const fileNames = await writer.finish();
        console.log(
            `All survey objects exported, ${excludedInterviewsCount} interviews excluded because some of their ` +
                'survey objects could not be created'
        );
        return fileNames;
    } finally {
        await writer.close();
    }
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
        .catch((error) => console.error('Survey objects export failed:', error))
        .finally(() => {
            runningExportNonce = undefined;
        });
    return 'exportStarted';
};

/** @returns {boolean} Whether the survey objects export is running */
export const isSurveyObjectsExportRunning = (): boolean => runningExportNonce !== undefined;
