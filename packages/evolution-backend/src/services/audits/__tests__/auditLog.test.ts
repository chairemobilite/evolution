/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AUDIT_LOG_PREFIX, AuditLog } from '../auditLog';

describe('AuditLog', () => {
    test.each([
        ['debug', 'debug'],
        ['info', 'info'],
        ['warn', 'warn'],
        ['error', 'error']
    ] as const)('%s prefixes a string message', (method, consoleMethod) => {
        const spy = jest.spyOn(console, consoleMethod).mockImplementation(() => undefined);
        AuditLog[method]('hello', 42);
        expect(spy).toHaveBeenCalledWith(`${AUDIT_LOG_PREFIX} hello`, 42);
        spy.mockRestore();
    });

    test('prefixes a non-string first argument', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const err = new Error('boom');
        AuditLog.error(err);
        expect(spy).toHaveBeenCalledWith(AUDIT_LOG_PREFIX, err);
        spy.mockRestore();
    });
});
