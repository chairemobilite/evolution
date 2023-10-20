/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import _cloneDeep from 'lodash/cloneDeep';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../audits.db.queries';
import interviewsDbQueries from '../interviews.db.queries';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';

const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const otherParticipant = {
    id: 2,
    is_valid: true,
    google_id: '1234'
};

const baseInterviewAttributes = {
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    responses: {
        accessCode: '11111',
        booleanField: true,
    },
    validations: {},
    logs: [],
};

const localUserInterviewAttributes = {
    id: 1,
    uuid: uuidV4(),
    participant_id: localParticipant.id,
    ...baseInterviewAttributes
};

const otherUserInterviewAttributes = {
    id: 2,
    uuid: uuidV4(),
    participant_id: otherParticipant.id,
    ...baseInterviewAttributes
};


beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_audits');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await create(knex, 'sv_participants', undefined, otherParticipant as any);
    await interviewsDbQueries.create(localUserInterviewAttributes);
    await interviewsDbQueries.create(otherUserInterviewAttributes);
});

afterAll(async() => {
    await truncate(knex, 'sv_audits');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
});

const removeUndefined = (obj) => {
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    });
    return obj;
}

const person1Uuid = uuidV4();
const person2Uuid = uuidV4();

const audits = [{
    objectType: 'interview',
    objectUuid: localUserInterviewAttributes.uuid,
    version: 2,
    isWarning: true,
    errorCode: 'InterviewErrorCode1',
    message: 'ThisOneHasAMessage',
    ignore: false
}, {
    objectType: 'interview',
    objectUuid: localUserInterviewAttributes.uuid,
    version: 2,
    errorCode: 'InterviewErrorCodeMinimal',
}, {
    objectType: 'person',
    objectUuid: person1Uuid,
    version: 2,
    errorCode: 'PersonErrorCode1',
    message: 'WithAMessage',
    ignore: false
}, {
    objectType: 'person',
    objectUuid: person2Uuid,
    version: 2,
    errorCode: 'PersonErrorCode1',
    message: 'WithAMessage',
    ignore: false
}] as AuditForObject[];

const expected = [
    audits[0], {
        ...audits[1],
        ignore: false
    },
    audits[2],
    audits[3]
];

const newAudits = [{
        objectType: 'person',
        objectUuid: person1Uuid,
        version: 2,
        errorCode: 'NewPersonErrorCode1',
        message: 'NewMessage1',
        ignore: false
    }, {
        objectType: 'person',
        objectUuid: person2Uuid,
        version: 2,
        errorCode: 'NewPersonErrorCode1',
        message: 'NewMEssage2',
        ignore: false
    }]

test('Set a few audits for an interview', async() => {
    const result = await dbQueries.setAuditsForInterview(localUserInterviewAttributes.id, audits);
    expect(result).toBeTruthy();
});

test('Get the audits for the previous interview', async() => {
    const dbAudits = await dbQueries.getAuditsForInterview(localUserInterviewAttributes.id);
    
    expect(dbAudits.length).toEqual(audits.length);
    for (let i = 0; i < audits.length; i++) {
        const findAudit = expected.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAudits[i])));
        expect(dbAudits[i]).toEqual(findAudit);
    }
});

test('Add same audits to other interview', async() => {
    const result = await dbQueries.setAuditsForInterview(otherUserInterviewAttributes.id, audits);
    expect(result).toBeTruthy();
});

test('Get the audits for both interviews', async() => {
    const dbAuditsLocal = await dbQueries.getAuditsForInterview(localUserInterviewAttributes.id);
    
    expect(dbAuditsLocal.length).toEqual(audits.length);
    for (let i = 0; i < audits.length; i++) {
        const findAudit = expected.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAuditsLocal[i])));
        expect(dbAuditsLocal[i]).toEqual(findAudit);
    }

    const dbAuditsOther = await dbQueries.getAuditsForInterview(otherUserInterviewAttributes.id);
    
    expect(dbAuditsOther.length).toEqual(audits.length);
    for (let i = 0; i < audits.length; i++) {
        const findAudit = expected.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAuditsOther[i])));
        expect(dbAuditsOther[i]).toEqual(findAudit);
    }
});

test('Set new audits for interview', async() => {
    const result = await dbQueries.setAuditsForInterview(otherUserInterviewAttributes.id, newAudits);
    expect(result).toBeTruthy();

    // Only the new audits should be set
    const dbAuditsOther = await dbQueries.getAuditsForInterview(otherUserInterviewAttributes.id);
    
    expect(dbAuditsOther.length).toEqual(newAudits.length);
    for (let i = 0; i < newAudits.length; i++) {
        const findAudit = newAudits.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAuditsOther[i])));
        expect(dbAuditsOther[i]).toEqual(findAudit);
    }
});

test('Set new audits for interview, with errors', async() => {

    const errorAudits = [{
        objectType: 'person',
        objectUuid: 'notAUUID',
        version: 2,
        errorCode: 'NewPersonErrorCode1',
        message: 'NewMessage1',
        ignore: false
    }]

    // The query should throw an error and the audits should not be modified
    await expect(dbQueries.setAuditsForInterview(otherUserInterviewAttributes.id, errorAudits))
        .rejects
        .toThrowError(expect.anything());
    
    const dbAuditsOther = await dbQueries.getAuditsForInterview(otherUserInterviewAttributes.id);
    expect(dbAuditsOther.length).toEqual(newAudits.length);
    for (let i = 0; i < newAudits.length; i++) {
        const findAudit = newAudits.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAuditsOther[i])));
        expect(dbAuditsOther[i]).toEqual(findAudit);
    }
    
});

test('Update audit', async() => {
    // Change the ignore status of one audit
    const modifiedAudit = _cloneDeep(newAudits[0]);
    modifiedAudit.ignore = true;

    // Send only the audit keys and ignore field, not the rest
    const result = await dbQueries.updateAudit(otherUserInterviewAttributes.id, {
        objectType: modifiedAudit.objectType,
        objectUuid: modifiedAudit.objectUuid,
        errorCode: modifiedAudit.errorCode,
        ignore: true,
        version: modifiedAudit.version
    });
    expect(result).toBeTruthy();

    const expectedAudits = [modifiedAudit, newAudits[1]];
    const dbAuditsOther = await dbQueries.getAuditsForInterview(otherUserInterviewAttributes.id);
    expect(dbAuditsOther.length).toEqual(expectedAudits.length);
    for (let i = 0; i < expectedAudits.length; i++) {
        const findAudit = expectedAudits.find(audit => JSON.stringify(audit) === JSON.stringify(removeUndefined(dbAuditsOther[i])));
        expect(dbAuditsOther[i]).toEqual(findAudit);
    }
});

