/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import fetchMock from 'jest-fetch-mock';
import _cloneDeep from 'lodash/cloneDeep';
import { addGroupedObjects, removeGroupedObjects } from 'evolution-common/lib/utils/helpers';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import * as SurveyActions from '../Survey';
import { prepareWidgets } from '../utils';
import { handleClientError, handleHttpOtherResponseCode } from '../../services/errorManagement/errorHandling';

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
    prepareWidgets: jest.fn().mockImplementation((_sectionShortname, interview, _affectedPaths, valuesByPath) => [_cloneDeep(interview), _cloneDeep(valuesByPath), false, false])
}));
const mockDispatch = jest.fn();
const mockPrepareWidgets = prepareWidgets as jest.MockedFunction<typeof prepareWidgets>;
const mockNext = jest.fn();
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
    fetchMock.doMock();
})

describe('Update interview', () => {

    test('Call with an interview, no validation change, no error', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        fetchMock.mockOnce(JSON.stringify({ status: 'success', interviewId: interviewAttributes.uuid }));
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({ 
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
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('Call with an interview, with validation and unset path', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        fetchMock.mockOnce(JSON.stringify({ status: 'success', interviewId: interviewAttributes.uuid }));
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const unsetPaths = ['responses.section2.q1'];
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        delete (expectedInterviewToPrepare.responses as any).section2.q1;
        mockPrepareWidgets.mockImplementationOnce((_sectionShortname, interview, _affectedPaths, valuesByPath) => {
            const innerInterview = _cloneDeep(interview);
            (innerInterview.validations as any).section1.q2 = true;
            return [innerInterview, {... valuesByPath, 'validations.section1.q2': true}, false, false];
        });
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        (expectedInterviewAsState.validations as any).section1.q2 = true;
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), unsetPaths, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true, 'responses.section2.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({ 
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
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('Test with previous and new server errors', async () => {
        // Prepare mock and test data
        const previousServerErrors = { 'section1.q1': { en: 'previous server error' }, 'section2.q1': { en: 'error that should not change' } };
        const mockLocalGetState = jest.fn().mockReturnValue({ survey: { interview: interviewAttributes, interviewLoaded: true, errors: previousServerErrors }});
        const updateCallback = jest.fn();
        const newServerMessages = { 'section1.q2': { en: 'New server error on q2' }};
        fetchMock.mockOnce(JSON.stringify({ status: 'invalid', interviewId: interviewAttributes.uuid, messages: newServerMessages }));
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockLocalGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, undefined);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({ 
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
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('Test with server updated values', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        // Return values by path updated by server
        const serverUpdatedValues = { 'responses.section1.q2': 'bar' };
        fetchMock.mockOnce(JSON.stringify({ status: 'invalid', interviewId: interviewAttributes.uuid, updatedValuesByPath: serverUpdatedValues }));
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        // Interview to prepare includes changes from valuesByPath
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        // Interview to set as state includes modifications by server
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        (expectedInterviewAsState.responses as any).section1.q2 = 'bar';
        expectedInterviewAsState.sectionLoaded = 'section';
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(2);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewAsState, {'responses.section1.q2': true}, { ...serverUpdatedValues }, true, testUser);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({ 
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
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('With local exception', async () => {
        // Prepare mock and test data, the prepareWidget function will throw an exception
        const updateCallback = jest.fn();
        mockPrepareWidgets.mockImplementationOnce(() => { throw 'error' });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockedHandleClientError).toHaveBeenCalledTimes(1);
        expect(mockedHandleClientError).toHaveBeenCalledWith(new Error('error'), { history: undefined, interviewId: interviewAttributes.id });
    });

    test('With fetch exception', async () => {
        // Prepare mock and test data, the fetch request will return a 401 error
        const updateCallback = jest.fn();
        fetchMock.mockOnce(JSON.stringify({ status: 'unauthorized' }), { status: 401 });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        
        // Do the actual test
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, {'responses.section1.q1': true}, { ...valuesByPath }, false, testUser);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenNthCalledWith(1, { 
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(2, { 
            type: 'DECREMENT_LOADING_STATE'
        });
        expect(updateCallback).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
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
        const { callback } = SurveyActions.startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(initialInterview), updateCallback);
        await callback(mockNext, mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareWidgets).toHaveBeenCalledWith('section', initialInterview, {'_all': true}, { ...valuesByPath }, false, testUser);
        expect(fetchMock).not.toHaveBeenCalled();

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
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

});

describe('startAddGroupedObjects', () => {
    const defaultAddGroupResponse = { 'responses.data': { _uuid: 'someuuid' }, 'validations.data': true };
    mockedAddGroupedObject.mockReturnValue(defaultAddGroupResponse);

    let startUpdateInterviewSpy;

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue({ queue: 'UPDATE_INTERVIEW', callback: jest.fn() });
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
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith(null, defaultAddGroupResponse, undefined, undefined, undefined);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ 
            queue: 'UPDATE_INTERVIEW',
            callback: expect.any(Function),
        });
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
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith(null, defaultAddGroupResponse, undefined, undefined, callback);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ 
            queue: 'UPDATE_INTERVIEW',
            callback: expect.any(Function),
        });
    });

});

describe('startRemoveGroupedObjects', () => {
    const defaultRemoveGroupResponse = [{ 'response.data.obj._sequence': 1 }, ['responses.data', 'validations.data']] as any;
    mockedRemoveGroupedObject.mockReturnValue(defaultRemoveGroupResponse);

    let startUpdateInterviewSpy;

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue({ queue: 'UPDATE_INTERVIEW', callback: jest.fn() });
    });

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
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith(null, defaultRemoveGroupResponse[0], defaultRemoveGroupResponse[1], undefined, undefined);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ 
            queue: 'UPDATE_INTERVIEW',
            callback: expect.any(Function),
        });
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
        expect(startUpdateInterviewSpy).toHaveBeenCalledWith(null, defaultRemoveGroupResponse[0], defaultRemoveGroupResponse[1], undefined, callback);
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ 
            queue: 'UPDATE_INTERVIEW',
            callback: expect.any(Function),
        });
    });

});