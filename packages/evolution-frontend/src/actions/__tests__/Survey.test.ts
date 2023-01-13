import fetchMock from 'jest-fetch-mock';
import _cloneDeep from 'lodash.clonedeep';
import { UserFrontendInterviewAttributes } from '../../services/interviews/interview';
import { startUpdateInterview } from '../Survey';
import { prepareWidgets } from '../utils';

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

// Default interview data
const interviewAttributes: UserFrontendInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
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
    mockDispatch.mockClear();
    mockPrepareWidgets.mockClear();
    fetchMock.doMock();
    fetchMock.mockClear();
    mockNext.mockClear();
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
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
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
                user_id: interviewAttributes.user_id,
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
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), unsetPaths, _cloneDeep(interviewAttributes), updateCallback);
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
                user_id: interviewAttributes.user_id,
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
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
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
                user_id: interviewAttributes.user_id,
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
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
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
                user_id: interviewAttributes.user_id,
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

    test('With exception', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        mockPrepareWidgets.mockImplementationOnce(() => { throw 'error' });
        const valuesByPath = { 'responses.section1.q1': 'foo' };
        const expectedInterviewToPrepare = _cloneDeep(interviewAttributes);
        (expectedInterviewToPrepare.responses as any).section1.q1 = 'foo';
        
        // Do the actual test
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(interviewAttributes), updateCallback);
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
    });

    test('Test with no change and _all set to true (after confirmation', async () => {
        // Prepare mock and test data
        const updateCallback = jest.fn();
        const valuesByPath = { '_all': true };
        const initialInterview = _cloneDeep(interviewAttributes);
        initialInterview.sectionLoaded = 'section';
        const expectedInterviewAsState = _cloneDeep(initialInterview);

        // Do the actual test
        const { callback } = startUpdateInterview('section', _cloneDeep(valuesByPath), undefined, _cloneDeep(initialInterview), updateCallback);
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