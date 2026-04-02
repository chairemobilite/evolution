/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import fs from 'fs';
import moment from 'moment';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { Response, Request } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import router from 'chaire-lib-backend/lib/api/admin.routes';
import { addExportRoutes } from './admin/exports.routes';
import { RespondentBehaviorService } from '../services/paradata/respondentBehavior';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import {
    getStartedInterviewsCount,
    getCompletedInterviewsCount,
    getInterviewsCompletionRate,
    getSurveyDifficultyDistribution
} from '../models/monitoring.db.queries';

addExportRoutes();
const execFileAsync = promisify(execFile);

/** Subfolder under OS temp dir for generator Excel uploads; cleaned per request after processing. */
const GENERATOR_UPLOAD_SUBDIR = 'evolution-generator-temp';
const GENERATOR_UPLOAD_FIELD = 'generatorFile';

// Unique basename for generator Excel uploads.
const uniqueGeneratorUploadBasename = (): string => {
    return `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 12)}`;
};

// Multer upload middleware for generator Excel files.
const generatorExcelUpload = multer({
    storage: multer.diskStorage({
        // Create the generator upload directory if it does not exist.
        destination: (_req, _file, cb) => {
            const dir = path.join(os.tmpdir(), GENERATOR_UPLOAD_SUBDIR);
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        // Generate a unique basename for the uploaded file.
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const supportedExts = new Set(['.xlsx', '.xlsm', '.xltx', '.xltm']);
            cb(null, `${uniqueGeneratorUploadBasename()}${supportedExts.has(ext) ? ext : '.xlsx'}`);
        }
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    // Only allow Excel 2010+ files (.xlsx, .xlsm, .xltx, .xltm) or the correct MIME type.
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const extOk = ext === '.xlsx' || ext === '.xlsm' || ext === '.xltx' || ext === '.xltm';
        const mimeOk =
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.template' ||
            file.mimetype === 'application/vnd.ms-excel.template.macroEnabled.12';
        // Require BOTH the filename extension (file.originalname) and MIME type (file.mimetype) to match.
        // So we don't accept corrupted files with the wrong extension or MIME type.
        if (extOk && mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel 2010+ (.xlsx, .xlsm, .xltx, .xltm) files are allowed'));
        }
    }
});

// Unlink the generator Excel file quietly when the request is done.
const unlinkGeneratorUploadQuiet = async (filePath: string | undefined): Promise<void> => {
    if (!filePath) {
        return;
    }
    try {
        await fs.promises.unlink(filePath);
    } catch {
        // File may already be removed or the temp dir cleared elsewhere.
    }
};

// Helper function to respond with an OK status
function respondOk<T>({ res, result }: { res: Response; result: T }): Response {
    const payload: Status.StatusResult<T> = Status.createOk(result);
    return res.status(200).json(payload);
}

// Helper function to respond with an error status
function respondError({
    res,
    message,
    httpStatus = 500
}: {
    res: Response;
    message: string;
    httpStatus?: number;
}): Response {
    const payload: Status.StatusError = Status.createError(message);
    return res.status(httpStatus).json(payload);
}

router.all('/data/widgets/:widget/', (req: Request, res: Response, _next) => {
    const widgetName = req.params.widget;

    if (!widgetName) {
        return respondError({ res, message: 'Provide a valid widget name', httpStatus: 400 });
    }
    switch (widgetName) {
    case 'started-and-completed-interviews-by-day':
        handleStartedAndCompletedInterviewsByDay(res);
        break;
    case 'started-interviews-count':
        // Get the count of started interviews
        handleStartedInterviewsCount(res);
        break;
    case 'completed-interviews-count':
        // Get the count of completed interviews
        handleCompletedInterviewsCount(res);
        break;
    case 'interviews-completion-rate':
        // Get the count of completed interviews
        handleInterviewsCompletionRate(res);
        break;
    case 'respondent-behavior-metrics':
        handleRespondentBehaviorMetrics(res);
        break;
    case 'survey-difficulty-distribution':
        // Get the survey difficulty distribution from respondent feedback
        handleSurveyDifficultyDistribution(res);
        break;
    default:
        return respondError({ res, message: `Admin monitoring widget '${widgetName}' not found`, httpStatus: 404 });
    }
});

// POST /generator/verify — multipart upload (multer field: generatorFile), temp file, then Excel integrity CLI (generator package).
router.post('/generator/verify', (req: Request, res: Response) => {
    generatorExcelUpload.single(GENERATOR_UPLOAD_FIELD)(req, res, (err: unknown) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return respondError({ res, message: err.message, httpStatus: 400 });
            }
            if (err instanceof Error) {
                return respondError({ res, message: err.message, httpStatus: 400 });
            }
            return respondError({ res, message: 'File upload failed', httpStatus: 400 });
        }

        void (async () => {
            const uploaded = req.file;
            if (!uploaded?.path) {
                return respondError({ res, message: 'No Excel file uploaded', httpStatus: 400 });
            }

            const resolvedExcelPath = uploaded.path;

            // Run the CLI via Poetry so generator deps (openpyxl, etc.) match pyproject.toml.
            const generatorPackageDirectory = path.resolve(__dirname, '../../../evolution-generator');
            const cliScriptPath = path.resolve(generatorPackageDirectory, 'src/scripts/check_excel_integrity_cli.py');

            try {
                if (!fs.existsSync(resolvedExcelPath)) {
                    return respondError({
                        res,
                        message: `Excel file not found at ${resolvedExcelPath}`,
                        httpStatus: 400
                    });
                }

                // Spawn Poetry in the generator package so `poetry run` uses that project's venv and pyproject.toml.
                // Args: run python <script> <excel path> — the script prints one JSON object per run on stdout.
                const { stdout, stderr } = await execFileAsync(
                    'poetry',
                    ['run', 'python', cliScriptPath, resolvedExcelPath],
                    {
                        cwd: generatorPackageDirectory,
                        timeout: 60_000, // 60 seconds before killing the process
                        killSignal: 'SIGKILL'
                    }
                );

                // Stderr may contain warnings even on success; log it but do not treat it as failure by itself.
                if (stderr?.trim()) {
                    console.warn('Python stderr for /api/admin/generator/verify:', stderr);
                }

                // Last non-empty line: one JSON object from the CLI.
                const outputLines = stdout
                    .trim()
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);

                // No output from the CLI → error
                if (outputLines.length === 0) {
                    return respondError({
                        res,
                        message: 'Excel integrity check produced no output',
                        httpStatus: 500
                    });
                }

                // Contract: stdout is a single JSON object (human-readable issues are inside `errors`, see check_excel_integrity_cli.py).
                const lastLine = outputLines[outputLines.length - 1];
                const parsedResult = JSON.parse(lastLine) as {
                    ok: boolean;
                    integrityOk?: boolean;
                    error?: string;
                    errors?: string[];
                    excelFilePath?: string;
                };

                // Python exception or crash → ok: false
                if (parsedResult.ok !== true) {
                    return respondError({
                        res,
                        message: `Excel integrity check failed: ${parsedResult.error ?? 'Unknown Python error'}`,
                        httpStatus: 500
                    });
                }

                // Validation failed → integrityOk false and/or errors[]
                const errorMessages =
                    Array.isArray(parsedResult.errors) && parsedResult.errors.length > 0
                        ? parsedResult.errors.join('\n')
                        : null;
                if (parsedResult.integrityOk !== true || errorMessages !== null) {
                    return respondError({
                        res,
                        message: errorMessages ?? 'Excel integrity check failed',
                        httpStatus: 422
                    });
                }

                // If we reach here, script ran and integrity check passed.
                return respondOk({
                    res,
                    result: {
                        integrityOk: true
                    }
                });
            } catch (error) {
                // Covers: poetry missing, venv not installed, process non-zero, invalid JSON, empty stdout, etc.
                console.error('Failed to execute generator integrity check:', error);
                if (error instanceof Error) {
                    return respondError({
                        res,
                        message: `Failed to execute Excel integrity check: ${error.message}`,
                        httpStatus: 500
                    });
                }
                return respondError({ res, message: 'Failed to execute Excel integrity check', httpStatus: 500 });
            } finally {
                await unlinkGeneratorUploadQuiet(resolvedExcelPath);
            }
        })().catch((unhandled) => {
            console.error('Unhandled error in /generator/verify:', unhandled);
            if (!res.headersSent) {
                respondError({ res, message: 'Unexpected error during verification', httpStatus: 500 });
            }
        });
    });
});

// TODO: add CSV export for this widget.
// TODO: Move this logic to monitoring.db.queries.ts
const handleStartedAndCompletedInterviewsByDay = async (res: Response) => {
    // Get the sum directly from the DB, using the started_at date for grouping
    const subquery = knex('sv_interviews').select(
        'id',
        knex.raw('to_char(created_at, \'YYYY-MM-DD\') as started_at_date'),
        knex.raw('case when response->>\'_completedAt\' is null then 0 else 1 end as is_completed')
    );
    const responses = await knex(subquery.as('resp_data'))
        .select('started_at_date')
        .count({ started_at: 'id' })
        .sum({ is_completed: 'is_completed' })
        .whereNotNull('started_at_date')
        .groupBy('started_at_date')
        .orderBy('started_at_date');
    if (responses.length <= 0) {
        return respondOk({
            res,
            result: { dates: [], started: [], completed: [], startedCount: 0, completedCount: 0 }
        });
    }
    // Create an array of dates with all dates in range
    const dates: string[] = [];
    const firstDate = moment(responses[0]['started_at_date']);
    const lastDate = moment(responses[responses.length - 1]['started_at_date']);
    for (let date = firstDate; date.diff(lastDate, 'days') <= 0; date.add(1, 'days')) {
        const dateStr = date.format('YYYY-MM-DD');
        dates.push(dateStr);
    }
    // Process database data into response field
    const dataByDate = {};
    responses.forEach((dateCount) => (dataByDate[dateCount['started_at_date']] = dateCount));
    const started = dates.map((date) => (dataByDate[date] !== undefined ? Number(dataByDate[date]['started_at']) : 0));
    const completed = dates.map((date) =>
        dataByDate[date] !== undefined ? Number(dataByDate[date]['is_completed']) : 0
    );
    const startedCount = started.reduce((cnt, startedCnt) => cnt + startedCnt, 0);
    const completedCount = completed.reduce((cnt, startedCnt) => cnt + startedCnt, 0);
    return respondOk({ res, result: { dates, started, completed, startedCount, completedCount } });
};

// Get the count of started interviews
const handleStartedInterviewsCount = async (res: Response): Promise<Response> => {
    try {
        const startedInterviewsCount = await getStartedInterviewsCount();
        return respondOk({ res, result: { startedInterviewsCount } });
    } catch (error) {
        console.error('Error fetching started interviews count:', error);
        return respondError({ res, message: 'Failed to fetch started interviews count', httpStatus: 500 });
    }
};

// Get the count of completed interviews
const handleCompletedInterviewsCount = async (res: Response): Promise<Response> => {
    try {
        const completedInterviewsCount = await getCompletedInterviewsCount();
        return respondOk({ res, result: { completedInterviewsCount } });
    } catch (error) {
        console.error('Error fetching completed interviews count:', error);
        return respondError({ res, message: 'Failed to fetch completed interviews count', httpStatus: 500 });
    }
};

// Get the interviews completion rate (completed / started, as a percentage, rounded to 1 decimal)
const handleInterviewsCompletionRate = async (res: Response): Promise<Response> => {
    try {
        const interviewsCompletionRate = await getInterviewsCompletionRate();
        return respondOk({ res, result: { interviewsCompletionRate } });
    } catch (error) {
        console.error('Error fetching interviews completion rate:', error);
        return respondError({ res, message: 'Failed to fetch interviews completion rate', httpStatus: 500 });
    }
};

// Get respondent behavior metrics
const handleRespondentBehaviorMetrics = async (res: Response): Promise<Response> => {
    try {
        const metrics = await RespondentBehaviorService.getRespondentBehaviorMetrics();
        return respondOk({ res, result: metrics });
    } catch (error) {
        console.error('Error fetching respondent behavior metrics:', error);
        return respondError({ res, message: 'Failed to fetch respondent behavior metrics', httpStatus: 500 });
    }
};

// Get the survey difficulty distribution from respondent feedback
const handleSurveyDifficultyDistribution = async (res: Response): Promise<Response> => {
    try {
        const distribution = await getSurveyDifficultyDistribution();
        return respondOk({ res, result: { distribution } });
    } catch (error) {
        console.error('Error fetching survey difficulty distribution:', error);
        return respondError({ res, message: 'Failed to fetch survey difficulty distribution', httpStatus: 500 });
    }
};

export default router;
