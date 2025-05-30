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
import { SurveyActionTypes } from '../../store/survey';
import { createNavigationService, NavigationService } from 'evolution-common/lib/services/questionnaire/sections/NavigationService';

//import fetchRetry from '@zeit/fetch-retry'
const fetchRetry = require('@zeit/fetch-retry')(require('node-fetch'));

const jsonFetchResolve = jest.fn();
let fetchStatus: number[] = [];
//jest.mock('node-fetch', () => jest.fn().mockImplementation(() => Promise.resolve({ status: fetchStatus.pop() || 200, json: jsonFetchResolve })));
//const fetchMock = fetch as jest.MockedFunction<typeof fetch>;


jest.mock('@zeit/fetch-retry', () => {
    const fetchMock = jest.fn().mockImplementation(() => Promise.resolve({ status: fetchStatus.pop() || 200, json: jsonFetchResolve }));
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

// Mock the navigation service
jest.mock('evolution-common/lib/services/questionnaire/sections/NavigationService', () => ({
    createNavigationService: jest.fn().mockReturnValue(({
        initNavigationState: jest.fn(),
        navigate: jest.fn()
    }))
}));
const navigationServiceMock = createNavigationService({});
const mockNavigate = navigationServiceMock.navigate as jest.MockedFunction<typeof navigationServiceMock.navigate>;
const mockInitNavigationState = navigationServiceMock.initNavigationState as jest.MockedFunction<typeof navigationServiceMock.initNavigationState>;

// Default interview data
const interviewAttributes: UserRuntimeInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    response: {
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
};

// Mock functions
jest.mock('../utils', () => ({
    prepareSectionWidgets: jest.fn().mockImplementation((_sectionShortname, interview, _affectedPaths, valuesByPath) => ({ updatedInterview: _cloneDeep(interview), updatedValuesByPath: _cloneDeep(valuesByPath), needUpdate: false }))
}));
const mockDispatch = jest.fn();
const mockPrepareSectionWidgets = prepareSectionWidgets as jest.MockedFunction<typeof prepareSectionWidgets>;
const mockGetState = jest.fn().mockImplementation(() => ({
    survey: {
        interview: _cloneDeep(interviewAttributes),
        interviewLoaded: true,
        errors: undefined,
        navigationService: navigationServiceMock
    },
    auth: {
        user: testUser
    }
}));

beforeEach(() => {
    jest.clearAllMocks();
    fetchStatus = [];
});

describe('Update interview', () => {

    test('Call with an interview, no validation change, no error', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'success', interviewId: interviewAttributes.uuid });
        const valuesByPath = { 'response.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true }, { ...valuesByPath }, false, testUser);
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

    test('Call with a "widgetInteraction" user action and no validations by path', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'success', interviewId: interviewAttributes.uuid });
        const valuesByPath = { 'validations.section1.q1': false };
        const userAction = {
            type: 'widgetInteraction' as const,
            widgetType: 'string',
            path: 'response.section1.q1',
            value: 'foo'
        };
        // Both path in user action and valuesByPath should have been updated
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';
        (expectedInterviewToPrepare.validations as any).section1.q1 = false;
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes), userAction }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true, 'validations.section1.q1': true }, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, sectionLoaded: 'section' },
                unsetPaths: [],
                userAction
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


    test('Call with an interview, with validation, unset path and "buttonClick" action', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        jsonFetchResolve.mockResolvedValue({ status: 'success', interviewId: interviewAttributes.uuid });
        const valuesByPath = { 'response.section1.q1': 'foo' };
        const buttonClickUserAction = {
            type: 'buttonClick' as const,
            buttonId: 'test'
        };
        const unsetPaths = ['response.section2.q1'];
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';
        delete (expectedInterviewToPrepare.response as any).section2.q1;
        mockPrepareSectionWidgets.mockImplementationOnce((_sectionShortname, interview, _affectedPaths, valuesByPath) => {
            const innerInterview = _cloneDeep(interview);
            (innerInterview.validations as any).section1.q2 = true;
            return { updatedInterview: innerInterview, updatedValuesByPath: { ... valuesByPath, 'validations.section1.q2': true }, needUpdate: false };
        });
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';
        (expectedInterviewAsState.validations as any).section1.q2 = true;

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), unsetPaths, interview: _cloneDeep(interviewAttributes), userAction: buttonClickUserAction }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true, 'response.section2.q1': true }, { ...valuesByPath }, false, testUser);
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/updateInterview', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                id: interviewAttributes.id,
                interviewId: interviewAttributes.uuid,
                participant_id: interviewAttributes.participant_id,
                valuesByPath: { ...valuesByPath, 'validations.section1.q2': true, sectionLoaded: 'section' },
                unsetPaths: ['response.section2.q1'],
                userAction: buttonClickUserAction
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
        const mockLocalGetState = jest.fn().mockReturnValue({ survey: { interview: interviewAttributes, interviewLoaded: true, errors: previousServerErrors } });
        const updateCallback = jest.fn();
        const newServerMessages = { 'section1.q2': { en: 'New server error on q2' } };
        jsonFetchResolve.mockResolvedValue({ status: 'invalid', interviewId: interviewAttributes.uuid, messages: newServerMessages });
        const valuesByPath = { 'response.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        expectedInterviewAsState.sectionLoaded = 'section';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview:_cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockLocalGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true }, { ...valuesByPath }, false, undefined);
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
            errors: { ...newServerMessages, 'section2.q1': previousServerErrors['section2.q1'] },
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
        const serverUpdatedValues = { 'response.section1.q2': 'bar' };
        jsonFetchResolve.mockResolvedValue({ status: 'invalid', interviewId: interviewAttributes.uuid, updatedValuesByPath: serverUpdatedValues });
        const valuesByPath = { 'response.section1.q1': 'foo' };
        // Interview to prepare includes changes from valuesByPath
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';
        // Interview to set as state includes modifications by server
        const expectedInterviewAsState = _cloneDeep(expectedInterviewToPrepare);
        (expectedInterviewAsState.response as any).section1.q2 = 'bar';
        expectedInterviewAsState.sectionLoaded = 'section';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(2);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true }, { ...valuesByPath }, false, testUser);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewAsState, { 'response.section1.q2': true }, { ...serverUpdatedValues }, true, testUser);
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
        mockPrepareSectionWidgets.mockImplementationOnce(() => { throw 'error'; });
        const valuesByPath = { 'response.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true }, { ...valuesByPath }, false, testUser);
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
        const valuesByPath = { 'response.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.response as any).section1.q1 = 'foo';

        // Do the actual test
        const callback = SurveyActions.startUpdateInterview({ sectionShortname: 'section', valuesByPath: _cloneDeep(valuesByPath), interview: _cloneDeep(interviewAttributes) }, updateCallback);
        await callback(mockDispatch, mockGetState);

        // Verifications
        expect(mockPrepareSectionWidgets).toHaveBeenCalledTimes(1);
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', expectedInterviewToPrepare, { 'response.section1.q1': true }, { ...valuesByPath }, false, testUser);
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
        expect(mockPrepareSectionWidgets).toHaveBeenCalledWith('section', initialInterview, { '_all': true }, { ...valuesByPath }, false, testUser);
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

describe('startNavigate', () => {

    let startUpdateInterviewSpy;
    let validateAndPrepareSectionSpy: jest.SpiedFunction<typeof SurveyActions.validateAndPrepareSection>;
    const startUpdateInterviewMock = jest.fn();

    // State mock with prior navigation
    const currentSection = { sectionShortname: 'currentSection' };
    const mockStateWithNav = () => ({
        survey: {
            interview: _cloneDeep(interviewAttributes),
            interviewLoaded: true,
            errors: undefined,
            navigationService: navigationServiceMock,
            navigation: {
                currentSection,
                navigationHistory: [{ sectionShortname: 'previousSection' }]
            }
        },
        auth: {
            user: testUser
        }
    });

    beforeAll(() => {
        startUpdateInterviewSpy = jest.spyOn(SurveyActions, 'startUpdateInterview').mockReturnValue(startUpdateInterviewMock);
        validateAndPrepareSectionSpy = jest.spyOn(SurveyActions, 'validateAndPrepareSection').mockImplementation((_s, interview, _a, valuesByPath, _U, _user) => [ interview, valuesByPath ]);
        jest.spyOn(bowser, 'getParser').mockReturnValue(bowser.getParser('test'));
    });

    afterAll(() => {
        startUpdateInterviewSpy.mockRestore();
        validateAndPrepareSectionSpy.mockRestore();
    });

    const validateIncrementLoadingStateCalls = (dispatch: jest.Mock) => {
        expect(mockDispatch).toHaveBeenNthCalledWith(1, {
            type: 'INCREMENT_LOADING_STATE'
        });
        expect(mockDispatch).toHaveBeenNthCalledWith(4, {
            type: 'DECREMENT_LOADING_STATE'
        });
    };

    test('should initialize navigation if called without parameters and without prior navigation', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        mockInitNavigationState.mockReturnValueOnce({ targetSection });

        // Do the actual test
        const callback = SurveyActions.startNavigate();
        await callback(mockDispatch, mockGetState);

        // validation function should not have been called
        expect(validateAndPrepareSectionSpy).not.toHaveBeenCalled();

        // Verify call to navigation service
        expect(mockInitNavigationState).toHaveBeenCalledTimes(1);
        expect(mockInitNavigationState).toHaveBeenCalledWith({ interview: interviewAttributes, requestedSection: undefined});

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection }
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });

    });
    
    test('should navigation to next section if called without parameters, but with prior navigation', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        mockNavigate.mockReturnValueOnce({ targetSection });
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate();
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, interviewAttributes, { _all: true }, { _all: true }, false, testUser);

        // Verify call to navigation service
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith({ interview: interviewAttributes, currentSection });

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection, previousSection: currentSection }
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });
    });

    test('should initialize navigation if called with requested section, no callback', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        const requestedSection = { sectionShortname: 'requestedSection' };
        mockInitNavigationState.mockReturnValueOnce({ targetSection });
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate({ requestedSection});
        await callback(mockDispatch, mockGetState);

        // validation function should not have been called
        expect(validateAndPrepareSectionSpy).not.toHaveBeenCalled();

        // Verify call to navigation service
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockInitNavigationState).toHaveBeenCalledTimes(1);
        expect(mockInitNavigationState).toHaveBeenCalledWith({ interview: interviewAttributes, requestedSection: requestedSection.sectionShortname });

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection }
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });
    });


    test('should call callback at the end', async () => {
        // Prepare mock and test data
        const navCallback = jest.fn();
        const targetSection = { sectionShortname: 'nextSection' };
        mockNavigate.mockReturnValueOnce({ targetSection });
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate(undefined, navCallback);
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, interviewAttributes, { _all: true }, { _all: true }, false, testUser);

        // Verify call to navigation service
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith({ interview: interviewAttributes, currentSection });

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection, previousSection: currentSection }
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });

        // Verify call to callback
        expect(navCallback).toHaveBeenCalledTimes(1);
        expect(navCallback).toHaveBeenCalledWith(interviewAttributes, targetSection);
    });

    test('should update interview with new values if valuesByPath returned by navigation', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        const navValuesByPath = { 'response.section1.q1': 'foo' };
        mockNavigate.mockReturnValueOnce({ targetSection, valuesByPath: navValuesByPath });
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate();
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, interviewAttributes, { _all: true }, { _all: true }, false, testUser);

        // Verify call to navigation service, interview should have been updated with values
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith({ interview: interviewAttributes, currentSection });

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection, previousSection: currentSection },
            valuesByPath: { ...navValuesByPath }
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });
    });

    test('should update interview with combined values by path from call, side effect, validate and nav', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        // Requested values come first
        const requestValuesByPath = { 'response.section1.q1': 'bar', 'response.section1.q2': 'blabla' };
        // Validation values by path next
        const validationValuesByPath = { 'response.section1.q2': true, 'response.section1.q3': 4 };
        // Nav values at the end
        const navValuesByPath = { 'response.section1.q1': 'foo', 'response.navField': 3 };
        
        mockNavigate.mockReturnValueOnce({ targetSection, valuesByPath: navValuesByPath });
        validateAndPrepareSectionSpy.mockImplementationOnce((_s, interview, _a, valuesByPath, _U, _user) => [ interview, validationValuesByPath ])
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate({ valuesByPath: requestValuesByPath});
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        // Don't validate the interview in this call. It was tested in other tests and since it was modified in place later in the function, the value changes from the original call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, expect.anything(), { _all: true }, { _all: true }, false, testUser);

        // Verify call to navigation service
        const expectedNavInterview = _cloneDeep(interviewAttributes);
        expectedNavInterview.response.section1.q1 = 'bar';
        expectedNavInterview.response.section1.q2 = true;
        expectedNavInterview.response.section1.q3 = 4;
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith({ interview: expectedNavInterview, currentSection });

        // Verify dispatch calls
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        validateIncrementLoadingStateCalls(mockDispatch);
        expect(mockDispatch).toHaveBeenNthCalledWith(2, startUpdateInterviewMock);

        // Verify interview update dispatch call
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledTimes(1);
        expect(SurveyActions.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: targetSection.sectionShortname,
            userAction: { type: 'sectionChange', targetSection, previousSection: currentSection },
            valuesByPath: Object.assign({}, requestValuesByPath, validationValuesByPath, navValuesByPath)
        });

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(3, {
            type: SurveyActionTypes.NAVIGATE,
            targetSection
        });
    });

    test('should stay on current page if current widgets are invalid', async () => {
        // Prepare mock and test data
        const targetSection = { sectionShortname: 'nextSection' };
        mockNavigate.mockReturnValueOnce({ targetSection });
        validateAndPrepareSectionSpy.mockImplementationOnce((_s, interview, _a, valuesByPath, _U, _user) => [ {...interview, allWidgetsValid: false }, valuesByPath ])
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate();
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, interviewAttributes, { _all: true }, { _all: true }, false, testUser);

        // Verify navigation service is not called
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

        // Verify dispatch calls to update
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(startUpdateInterviewMock).not.toHaveBeenCalled();

        // Verify navigation update call
        expect(mockDispatch).toHaveBeenNthCalledWith(2, {
            type: SurveyActionTypes.UPDATE_INTERVIEW,
            interviewLoaded: true,
            interview: { ...interviewAttributes, allWidgetsValid: false },
            errors: {},
            submitted: true
        });
    });

    test('should properly handle exceptions', async () => {
        // Prepare mock and test data, throw exception in navigation function
        const targetSection = { sectionShortname: 'nextSection' };
        mockNavigate.mockReturnValueOnce({ targetSection });
        const error = new Error('Validation error');
        validateAndPrepareSectionSpy.mockImplementationOnce(() => { throw error; });
        mockGetState.mockImplementationOnce(mockStateWithNav);

        // Do the actual test
        const callback = SurveyActions.startNavigate();
        await callback(mockDispatch, mockGetState);

        // Verify validation function call
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledTimes(1);
        expect(validateAndPrepareSectionSpy).toHaveBeenCalledWith(currentSection.sectionShortname, interviewAttributes, { _all: true }, { _all: true }, false, testUser);

        // Verify navigation service is not called
        expect(mockInitNavigationState).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

        // Verifications
        expect(handleClientError).toHaveBeenCalledTimes(1);
        expect(handleClientError).toHaveBeenCalledWith(error, { interviewId: interviewAttributes.id });
    });

});

describe('startAddGroupedObjects', () => {
    const defaultAddGroupResponse = { 'response.data': { _uuid: 'someuuid' }, 'validations.data': true };
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
        const attributes = [{ field1: 'abc' }, { field2: 'def' }];
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
        const attributes = [{ field1: 'abc' }, { field2: 'def' }];
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
    const defaultRemoveGroupResponse = [{ 'response.data.obj._sequence': 1 }, ['response.data', 'validations.data']] as any;
    mockedRemoveGroupedObject.mockReturnValue(defaultRemoveGroupResponse);

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
            type: 'section' as const,
            widgets: [],
            previousSection: 'sectionFirst',
            nextSection: null,
            enableConditional: true,
            completionConditional: true,
            navMenu: { type: 'inNav' as const, menuName: 'sectionLast' }
        }, sectionFirst:  {
            type: 'section' as const,
            widgets: [],
            previousSection: null,
            nextSection: 'sectionLast',
            enableConditional: true,
            completionConditional: true,
            navMenu: { type: 'inNav' as const, menuName: 'sectionFirst' }
        }
    };

    const initialAppConfigSections = _cloneDeep(applicationConfiguration.sections);
    let startNavigateSpy;
    const startNavigateMock = jest.fn();

    beforeAll(() => {
        startNavigateSpy = jest.spyOn(SurveyActions, 'startNavigate').mockReturnValue(startNavigateMock);
        applicationConfiguration.sections = applicationSections as any;
        jest.spyOn(bowser, 'getParser').mockReturnValue(bowser.getParser('test'));
    });

    afterAll(() => {
        startNavigateSpy.mockRestore();
        applicationConfiguration.sections = initialAppConfigSections;
    });

    test('No prefilled response', async () => {

        // Prepare mock and test data
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: 'include'
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenCalledWith({
            type: SurveyActionTypes.SET_INTERVIEW,
            interview: returnedInterview,
            interviewLoaded: true
        });
        expect(mockDispatch).toHaveBeenCalledWith(startNavigateMock);
        expect(SurveyActions.startNavigate).toHaveBeenCalledWith({
            requestedSection: undefined,
            valuesByPath: {
                'response._browser': expect.anything()
            }
        });
    });

    test('With prefilled response and section', async () => {

        // Prepare mock and test data
        const prefilledResponse = { fieldA: 'valueA', fieldB: 'valueB' };
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview('sectionFirst', undefined, undefined, prefilledResponse);
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: 'include'
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenCalledWith({
            type: SurveyActionTypes.SET_INTERVIEW,
            interview: returnedInterview,
            interviewLoaded: true
        });
        expect(mockDispatch).toHaveBeenCalledWith(startNavigateMock);
        expect(SurveyActions.startNavigate).toHaveBeenCalledWith({
            requestedSection: { sectionShortname: 'sectionFirst' },
            valuesByPath: {
                'response._browser': expect.anything(),
                'response.fieldA': 'valueA',
                'response.fieldB': 'valueB'
            }
        });

    });

    test('No interview returned, should give an error message', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error')

        // Prepare mock and test data
        jsonFetchResolve.mockResolvedValue({ status: 'success' });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview();
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith('/api/survey/activeInterview', expect.objectContaining({
            credentials: 'include'
        }));
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Get active interview: no interview was returned, it\'s not supposed to happen');
        expect(SurveyActions.startNavigate).not.toHaveBeenCalled();
    });

    test('with interview UUID', async () => {

        const uuid = uuidV4();

        // Prepare mock and test data
        const returnedInterview = _cloneDeep(interviewAttributes);
        jsonFetchResolve.mockResolvedValue({ status: 'success', interview: returnedInterview });

        // Do the actual test
        const dispatchFct = SurveyActions.startSetInterview('sectionFirst', uuid);
        await dispatchFct(mockDispatch, mockGetState);

        // Verifications
        expect(fetchRetryMock).toHaveBeenCalledTimes(1);
        expect(fetchRetryMock).toHaveBeenCalledWith(`/api/survey/activeInterview/${uuid}`, expect.objectContaining({
            credentials: 'include'
        }));
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockDispatch).toHaveBeenCalledWith({
            type: SurveyActionTypes.SET_INTERVIEW,
            interview: returnedInterview,
            interviewLoaded: true
        });
        expect(mockDispatch).toHaveBeenCalledWith(startNavigateMock);
        expect(SurveyActions.startNavigate).toHaveBeenCalledWith({
            requestedSection: { sectionShortname: 'sectionFirst' },
            valuesByPath: {
                'response._browser': expect.anything()
            }
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
            credentials: 'include'
        }));
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(SurveyActions.startNavigate).not.toHaveBeenCalled();

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
