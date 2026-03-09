/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { runEmailAuditCheckTests } from './testHelper';
import { interviewAuditChecks } from '../../InterviewAuditChecks';

describe('I_I_HelpContactEmail audit check', () => {
    runEmailAuditCheckTests({
        checkFn: interviewAuditChecks.I_I_HelpContactEmail,
        checkName: 'I_I_HelpContactEmail',
        emailField: 'helpContactEmail',
        errorMessage: 'Help contact email is invalid'
    });
});
