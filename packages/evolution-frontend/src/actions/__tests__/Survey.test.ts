/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import _cloneDeep from 'lodash/cloneDeep';
import { addGroupedObjects, removeGroupedObjects } from 'evolution-common/lib/utils/helpers';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import * as SurveyActions from '../Survey';
import { prepareSectionWidgets } from '../utils';
import { handleClientError, handleHttpOtherResponseCode } from '../../services/errorManagement/errorHandling';
import applicationConfiguration from '../../config/application.config';
import bowser from 'bowser';
//import fetchRetry from '@zeit/fetch-retry'
const fetchRetry = require('@zeit/fetch-retry')(require('node-fetch'));

const jsonFetchResolve = jest.fn();
let fetchStatus: number[] = []
//jest.mock('node-fetch', () => jest.fn().mockImplementation(() => Promise.resolve({ status: fetchStatus.pop() || 200, json: jsonFetchResolve })));
//const fetchMock = fetch as jest.MockedFunction<typeof fetch>;


jest.mock('@zeit/fetch-retry', () => {
    const fetchMock = jest.fn().mockImplementation(() => Promise.resolve({ status: fetchStatus.pop() || 200, json: jsonFetchResolve }))
    return () => fetchMock;
});
const fetchRetryMock = fetchRetry as jest.MockedFunction<typeof fetchRetry>;

jest.mock('../../config/i18n.config', () => ({
    language: 'en'
}));
jest.mock('evolution-common/lib/utils/helpers', () => {
    // Require the original module to not be mocked...
    const originalModule =
        jest.requireActual<typeof import('evolution-common/lib/utils/helpers')>('evolution-common/lib/utils/helpers');

    return {
        ...originalModule,
        addGroupedObjects: jest.fn(),
        removeGroupedObjects: jest.fn()
    };
});
const mockedAddGroupedObject = addGroupedObjects as jest.MockedFunction<typeof addGroupedObjects>;
const mockedRemoveGroupedObject = removeGroupedObjects as jest.MockedFunction<typeof removeGroupedObjects>;
// Mock wrong response code handler
jest.mock('../../services/errorManagement/errorHandling', () => ({
    handleHttpOtherResponseCode: jest.fn(),
    handleClientError: jest.fn()
}));
const mockedHandleHttpOtherResponseCode = handleHttpOtherResponseCode as jest.MockedFunction<typeof handleHttpOtherResponseCode>;
const mockedHandleClientError = handleClientError as jest.MockedFunction<typeof handleClientError>;

// Default interview data
const interviewAttributes: UserRuntimeInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    responses: {
        _language: 'en',
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true,
    widgets: {},
    groups: {},
    visibleWidgets: [],
    allWidgetsValid: true
};

const testUser = {
    id: 1,
    username: 'test',
    preferences: { },
    serializedPermissions: [],
    isAuthorized: jest.fn(),
    is_admin: false,
    pages: [],
    showUserInfo: true
}

// Mock functions
jest.mock('../utils', () => ({
    prepareSectionWidgets: jest.fn().mockImplementation((_sectionShortname, interview, _affectedPaths, valuesByPath) => ({ updatedInterview: _cloneDeep(interview), updatedValuesByPath: _cloneDeep(valuesByPath), needUpdate: false }))
}));
const mockDispatch = jest.fn();
const mockPrepareSectionWidgets = prepareSectionWidgets as jest.MockedFunction<typeof prepareSectionWidgets>;
const mockGetState = jest.fn().mockReturnValue({
    survey: {
        interview: interviewAttributes,
        interviewLoaded: true,
        errors: undefined
    },
    auth: {
        user: testUser
    }
});

beforeEach(() => {
    jest.clearAllMocks();
    fetchStatus = [];
})

describe('Update interview', () => {

    test('Call with an interview, no validation change, no error', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'success', interviewId: interviewAttributes.uuid });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, sectionLoaded: 'section' },
                unsetPaths: []
            })
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'UPDATE_INTERVIEW',
            interviewLoaded: true,
            interview: expectedInterviewAsState,
            errors: {},
            submitted: false
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(3, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).toHaveBeenCalledWith(expectedInterviewAsState);
    });

    test('Call with an interview, with validation and unset path', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'success', interviewId: interviewAttributes.uuid });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const unsetPaths = ['responses.section2.q1'];
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        delete (expectedInterviewToPrepare.responses as any).section2.q1;
        mockPrepareSectionWidgets.mockImplementationOnce((_sectionShortname, interview, _affectedPaths, valuesByPath) => {
            const innerInterview = _cloneDeep(interview);
            (innerInterview.validations as any).section1.q2 = true;
            return { updatedInterview: innerInterview, updatedValuesByPath: {... valuesByPath, 'validations.section1.q2': true}, needUpdate: false };
        });
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        (expectedInterviewAsState.validations as any).section1.q2 = true;
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), unsetPaths, interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true, 'responses.section2.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, 'validations.section1.q2': true, sectionLoaded: 'section' },
                unsetPaths: ['responses.section2.q1']
            })
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'UPDATE_INTERVIEW',
            interviewLoaded: true,
            interview: expectedInterviewAsState,
            errors: {},
            submitted: false
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(3, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).toHaveBeenCalledWith(expectedInterviewAsState);
    });

    test('Test with previous and new server errors', async () => {
        // Prepare mock and test data
        const previousServerErrors = { 'section1.q1': { en: 'previous server error' }, 'section2.q1': { en: 'error that should not change' } };
        const mockLocalGetState = jest.fn().mockReturnValue({ survey: { interview: interviewAttributes, interviewLoaded: true, errors: previousServerErrors }});
        const updateCallback = jest.fn();
        const newServerMessages = { 'section1.q2': { en: 'New server error on q2' }};
        jsonFetchResolve.mockResolvedValue({ status: 'invalid', interviewId: interviewAttributes.uuid, messages: newServerMessages });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview:_cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockLocalGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, undefined);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, sectionLoaded: 'section' },
                unsetPaths: []
            })
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'UPDATE_INTERVIEW',
            interviewLoaded: true,
            interview: expectedInterviewAsState,
            errors: { ...newServerMessages, 'section2.q1': previousServerErrors['section2.q1']},
            submitted: false
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(3, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).toHaveBeenCalledWith(expectedInterviewAsState);
    });

    test('Test with server updated values', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        // Return values by path updated by server
        const serverUpdatedValues = { 'responses.section1.q2': 'bar' };
        jsonFetchResolve.mockResolvedValue({ status: 'invalid', interviewId: interviewAttributes.uuid, updatedValuesByPath: serverUpdatedValues });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        // Interview to prepare includes changes from valuesByPath
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        // Interview to set as state includes modifications by server
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        (expectedInterviewAsState.responses as any).section1.q2 = 'bar';
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(2);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewAsState, {'responses.section1.q2': true}, { ...serverUpdatedValues }, true, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, sectionLoaded: 'section' },
                unsetPaths: []
            })
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'UPDATE_INTERVIEW',
            interviewLoaded: true,
            interview: expectedInterviewAsState,
            errors: { },
            submitted: false
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(3, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).toHaveBeenCalledWith(expectedInterviewAsState);
    });

    test('With local exception', async () => {
        // Prepare mock and test data, the prepareWidget function will throw an exception
        const updateCallback = jest.fn();
        mockPrepareSectionWidgets.mockImplementationOnce(() => { throw 'error' });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).not.toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).not.toHaveBeenCalled();
        expect(mockedHandleClientError).toHaveBeenCalledTimes(1);
        expect(mockedHandleClientError).toHaveBeenCalledWith(new Error('error'), { history: undefined, interviewId: interviewAttributes.id });
    });

    test('With fetch exception', async () => {
        // Prepare mock and test data, the fetch request will return a 401 error
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'unauthorized' });
        fetchStatus.push(401);
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        
        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).not.toHaveBeenCalled();
        expect(mockedHandleHttpOtherResponseCode).toHaveBeenCalledTimes(1);
        expect(mockedHandleHttpOtherResponseCode).toHaveBeenCalledWith(401, mockDispatch, undefined);
    });

    test('Test with no change and _all set to true (after confirmation', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        const valuesByPath = { '_all': true };
        const initialInterview = _cloneDeep(interviewAttributes);
        initialInterview.sectionLoaded = 'section';
        const expectedInterviewAsState = _cloneDeep(initialInterview);

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(initialInterview) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', initialInterview, {'_all': true}, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).not.toHaveBeenCalled();

        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, {
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, {
            type: 'UPDATE_INTERVIEW',
            interviewLoaded: true,
            interview: expectedInterviewAsState,
            errors: {},
            submitted: true
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).toHaveBeenCalledWith(expectedInterviewAsState);
    });

});

describe('startAddGroupedObjects', () => {
    const defaultAddGroupResponse = { 'responses.data': { _uuid: 'someuuid' }, 'validations.data': true };
    mockedAddGroupedObject.mockReturnValue(defaultAddGroupResponse);

    let startUpdateInterviewSpy;
    const startUpdateInterviewMock = jest.fn();

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue(startUpdateInterviewMock);
    });

    afterAll(() => {
        startUpdateInterviewSpy.mockRestore();
    });

    test('Call with minimal data', async () => {
        // Prepare function parameters
        const newObjectCnt = 3;
        const insertSeq = 1;
        const path = 'data';

        // Do the actual test
        const dispatchFct = SurveyActions.startAddGroupedObjects(newObjectCnt, insertSeq, path);
        dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedAddGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedAddGroupedObject).toHaveBeenCalledWith(interviewAttributes, newObjectCnt, insertSeq, path, []);
        expect(startUpdateInterviewSpy).toHaveBeenCalledTimes(1);
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith({ valuesByPath: defaultAddGroupResponse }, undefined);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
    });

    test('Call with return only and callback', async () => {
        // Prepare function parameters
        const newObjectCnt = 3;
        const insertSeq = 1;
        const path = 'data';
        const attributes = [{ field1: 'abc'}, { field2: 'def' }];
        const callback = jest.fn();

        // Do the actual test
        const dispatchFct = SurveyActions.startAddGroupedObjects(newObjectCnt, insertSeq, path, attributes, callback, true);
        const vals = dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedAddGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedAddGroupedObject).toHaveBeenCalledWith(interviewAttributes, newObjectCnt, insertSeq, path, attributes);
        expect(startUpdateInterviewSpy).not.toHaveBeenCalled();
        expect(vals).toEqual(defaultAddGroupResponse);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('Call with callback', async () => {
        // Prepare function parameters
        const newObjectCnt = 3;
        const insertSeq = 1;
        const path = 'data';
        const attributes = [{ field1: 'abc'}, { field2: 'def' }];
        const callback = jest.fn();

        // Do the actual test
        const dispatchFct = SurveyActions.startAddGroupedObjects(newObjectCnt, insertSeq, path, attributes, callback, false);
        dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedAddGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedAddGroupedObject).toHaveBeenCalledWith(interviewAttributes, newObjectCnt, insertSeq, path, attributes);
        expect(startUpdateInterviewSpy).toHaveBeenCalledTimes(1);
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith({ valuesByPath: defaultAddGroupResponse }, callback);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
    });

});

describe('startRemoveGroupedObjects', () => {
    const defaultRemoveGroupResponse = [{ 'response.data.obj._sequence': 1 }, ['responses.data', 'validations.data']] as any;
    mockedRemoveGroupedObject.mockReturnValue(defaultRemoveGroupResponse);

    let startUpdateInterviewSpy;
    const startUpdateInterviewMock = jest.fn();

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue(startUpdateInterviewMock);
    })

    afterAll(() => {
        startUpdateInterviewSpy.mockRestore();
    });

    test('Call with minimal data', async () => {
        // Prepare function parameters
        const paths = 'data';

        // Do the actual test
        const dispatchFct = SurveyActions.startRemoveGroupedObjects(paths);
        dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedRemoveGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedRemoveGroupedObject).toHaveBeenCalledWith(interviewAttributes, paths);
        expect(startUpdateInterviewSpy).toHaveBeenCalledTimes(1);
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith({ valuesByPath: defaultRemoveGroupResponse[0], unsetPaths: defaultRemoveGroupResponse[1] }, undefined);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
    });

    test('Call with return only and callback', async () => {
        // Prepare function parameters
        const paths = 'data';
        const callback = jest.fn();

        // Do the actual test
        const dispatchFct = SurveyActions.startRemoveGroupedObjects(paths, callback, true);
        const vals = dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedRemoveGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedRemoveGroupedObject).toHaveBeenCalledWith(interviewAttributes, paths);
        expect(startUpdateInterviewSpy).not.toHaveBeenCalled();
        expect(vals).toEqual(defaultRemoveGroupResponse);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('Call with callback', async () => {
        // Prepare function parameters
        const paths = 'data';
        const callback = jest.fn();

        // Do the actual test
        const dispatchFct = SurveyActions.startRemoveGroupedObjects(paths, callback, false);
        dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(mockedRemoveGroupedObject).toHaveBeenCalledTimes(1);
        expect(mockedRemoveGroupedObject).toHaveBeenCalledWith(interviewAttributes, paths);
        expect(startUpdateInterviewSpy).toHaveBeenCalledTimes(1);
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith({ valuesByPath: defaultRemoveGroupResponse[0], unsetPaths: defaultRemoveGroupResponse[1] }, callback);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
    });

});

describe('startSetInterview', () => {

    // Prepare minimal questionnaire section config
    const applicationSections = {
        sectionLast:  {
            widgets: [],
            previousSection: 'sectionFirst',
            nextSection: null
        }, sectionFirst:  {
            widgets: [],
            previousSection: null,
            nextSection: 'sectionLast'
        }
    }

    let initialAppConfigSections = _cloneDeep(applicationConfiguration.sections);
    let startUpdateInterviewSpy;
    let startCreateInterviewSpy;
    const startUpdateInterviewMock = jest.fn();
    const startCreateInterviewMock = jest.fn();

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue(startUpdateInterviewMock);
        startCreateInterviewSpy = jest.spyOn(SurveyActions, 'startCreateInterview').mockReturnValue(startCreateInterviewMock);
        applicationConfiguration.sections = applicationSections;
        jest.spyOn(bowser, 'getParser').mockReturnValue(bowser.getParser('test'));
    });

    afterAll(() => {
        startUpdateInterviewSpy.mockRestore();
        startCreateInterviewSpy.mockRestore();
        applicationConfiguration.sections = initialAppConfigSections;
    });

    test('No prefilled responses', async () => {

        // Prepare mock and test data
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview});

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'sectionFirst', 
            valuesByPath: {
                'responses._activeSection': 'sectionFirst',
                'responses._browser': expect.anything()
            }, interview: returnedInterview
        });

    });

    test('With prefilled responses and section', async () => {

        // Prepare mock and test data
        const prefilledResponses = { fieldA: 'valueA', fieldB: 'valueB' };
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview});

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview('sectionFirst', undefined, undefined, prefilledResponses);
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'sectionFirst',
            valuesByPath: {
                'responses._activeSection': 'sectionFirst',
                'responses._browser': expect.anything(),
                'responses.fieldA': 'valueA',
                'responses.fieldB': 'valueB'
            }, interview: returnedInterview
        });

    });

    test('No interview returned, should create one', async () => {

        // Prepare mock and test data
        jsonFetchResolve.mockResolvedValue({ status: 'success' });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startCreateInterviewMock);
        expect(SurveyActions.startCreateInterview).toHaveBeenCalledWith(undefined);

    });

    test('with interview UUID', async () => {

        const uuid = uuidV4();

        // Prepare mock and test data
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview});

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview('sectionFirst', uuid);
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith(`/api/survey/activeInterview/${uuid}`, expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'sectionFirst',
            valuesByPath: {
                'responses._activeSection': 'sectionFirst',
                'responses._browser': expect.anything()
            }, interview: returnedInterview
        });

    });

    test('Invalid response from server', async () => {

        // Prepare mock and test data
        fetchStatus.push(401);
        jsonFetchResolve.mockResolvedValue({ status: 'unauthorized' });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(SurveyActions.startUpdateInterview).not.toHaveBeenCalled();

    });

    test('Exception while fetching', async () => {

        // Prepare mock and test data
        const error = new Error('error fetching');
        fetchRetryMock.mockRejectedValueOnce(error);

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(handleClientError).toHaveBeenCalledTimes(1);
        expect(handleClientError).toHaveBeenCalledWith(error, { history: undefined, interviewId: undefined });

    });

});

describe('startCreateInterview', () => {

    // Prepare minimal questionnaire section config
    const applicationSections = {
        sectionLast:  {
            widgets: [],
            previousSection: 'sectionFirst',
            nextSection: null
        }, sectionFirst:  {
            widgets: [],
            previousSection: null,
            nextSection: 'sectionLast'
        }
    }

    let initialAppConfigSections = _cloneDeep(applicationConfiguration.sections);
    let startUpdateInterviewSpy;
    const startUpdateInterviewMock = jest.fn();

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue(startUpdateInterviewMock);
        applicationConfiguration.sections = applicationSections;
        jest.spyOn(bowser, 'getParser').mockReturnValue(bowser.getParser('test'));
    });

    afterAll(() => {
        startUpdateInterviewSpy.mockRestore();
        applicationConfiguration.sections = initialAppConfigSections;
    });

    test('No prefilled responses', async () => {

        // Prepare mock and test data
        const returnedInterview = {
            id: 1,
            uuid: 'arbitrary uuid',
            participant_id: 1,
            is_completed: false,
            responses: {},
            validations: {},
            is_valid: true
        }
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview});

        // Do the actual test
        const dispatchFct = SurveyActions.startCreateInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/createInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'sectionFirst',
            valuesByPath: {
                'responses._activeSection': 'sectionFirst',
                'responses._browser': expect.anything()
            }, interview: returnedInterview
        });

    });

    test('With prefilled responses', async () => {

        // Prepare mock and test data
        const prefilledResponses = { fieldA: 'valueA', fieldB: 'valueB' };
        const returnedInterview = {
            id: 1,
            uuid: 'arbitrary uuid',
            participant_id: 1,
            is_completed: false,
            responses: {},
            validations: {},
            is_valid: true
        }
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview});

        // Do the actual test
        const dispatchFct = SurveyActions.startCreateInterview(prefilledResponses);
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/createInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(startUpdateInterviewMock);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'sectionFirst',
            valuesByPath: {
                'responses._activeSection': 'sectionFirst',
                'responses._browser': expect.anything(),
                'responses.fieldA': 'valueA',
                'responses.fieldB': 'valueB'
            }, interview: returnedInterview
        });

    });

    test('No interview returned', async () => {

        // Prepare mock and test data
        jsonFetchResolve.mockResolvedValue({ status: 'success' });

        // Do the actual test
        const dispatchFct = SurveyActions.startCreateInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(handleClientError).toHaveBeenCalledTimes(1);
        expect(handleClientError).toHaveBeenCalledWith('createInterview returned success but no interview was returned', { history: undefined, interviewId: undefined });

    });

    test('Invalid response from server', async () => {

        // Prepare mock and test data
        fetchStatus.push(401);
        jsonFetchResolve.mockResolvedValue({ status: 'unauthorized' });

        // Do the actual test
        const dispatchFct = SurveyActions.startCreateInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/createInterview', expect.objectContaining({
            credentials: "include"
        }));
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(SurveyActions.startUpdateInterview).not.toHaveBeenCalled();

    });

    test('Exception while fetching', async () => {

        // Prepare mock and test data
        const error = new Error('error fetching');
        fetchRetryMock.mockRejectedValueOnce(error);

        // Do the actual test
        const dispatchFct = SurveyActions.startCreateInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(handleClientError).toHaveBeenCalledTimes(1);
        expect(handleClientError).toHaveBeenCalledWith(error, { history: undefined, interviewId: undefined });

    });

});