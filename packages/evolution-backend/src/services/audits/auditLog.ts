/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/** Stable prefix so audit and factory console lines can be filtered in server logs. */
export const AUDIT_LOG_PREFIX = '[Audit]';

const prefixArgs = (args: unknown[]): unknown[] => {
    if (args.length > 0 && typeof args[0] === 'string') {
        return [`${AUDIT_LOG_PREFIX} ${args[0]}`, ...args.slice(1)];
    }
    return [AUDIT_LOG_PREFIX, ...args];
};

/**
 * Console logger for the audit workflow and survey-object factories.
 * Use this instead of `console.*` so the prefix stays in one place.
 *
 * TODO: replace this manual prefix with a real structured logger (winston or
 * similar) when the backend adopts one.
 *
 * Levels (Node sends `debug`/`info` to stdout, `warn`/`error` to stderr):
 * - `error`: unexpected exception or a batch/job that failed
 * - `warn`: audit skipped because a required object is missing
 * - `info`: batch progress (start / N of M / done)
 * - `debug`: per-interview detail and factory outcomes (creation failed,
 *   skipped attributes). These are interview data that become audits, not
 *   server crashes.
 */
export const AuditLog = {
    debug: (...args: unknown[]): void => {
        console.debug(...prefixArgs(args));
    },
    info: (...args: unknown[]): void => {
        console.info(...prefixArgs(args));
    },
    warn: (...args: unknown[]): void => {
        console.warn(...prefixArgs(args));
    },
    error: (...args: unknown[]): void => {
        console.error(...prefixArgs(args));
    }
};
