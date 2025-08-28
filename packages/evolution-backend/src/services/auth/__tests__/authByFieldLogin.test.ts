/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import passport from 'passport';
import byFieldLogin from '../authByFieldLogin';
import { participantAuthModel, ParticipantModel } from '../participantAuthModel';
import interviewsPreFillQueries from '../../../models/interviewsPreFill.db.queries';
import { registerAccessCodeValidationFunction } from 'evolution-backend/lib/services/accessCode';

// Access code is 4 digits, dash, 4 digits
registerAccessCodeValidationFunction((accessCode) => accessCode.match(/^\d{4}-? *\d{4}$/gi) !== null);

// Create a mock for recordLogin
const mockRecordLogin = jest.fn();

// Mock the validateAccessCode function
jest.mock('../../accessCode', () => ({
    validateAccessCode: jest.fn().mockImplementation((accessCode) => {
        // Simple mock implementation for testing
        return accessCode && accessCode.match(/^\d{4}-\d{4}$/) ? true : false;
    })
}));
// Mock the ParticipantModel class
jest.mock('../participantAuthModel', () => {
    const originalModule = jest.requireActual('../participantAuthModel');
    
    // Create a mock ParticipantModel class
    class MockParticipantModel {
        public attributes: any;
        
        constructor(attributes: any) {
            this.attributes = attributes;
        }
        
        recordLogin = mockRecordLogin;
        
        sanitize() {
            return {
                id: this.attributes.id,
                username: this.attributes.username,
                email: undefined,
                firstName: undefined,
                lastName: undefined,
                preferences: {},
                serializedPermissions: []
            };
        }
        
        async verifyPassword(password: string) {
            // Simple mock implementation
            return password.toUpperCase() === validPostalCode;
        }
    }
    
    return {
        ...originalModule,
        participantAuthModel: {
            find: jest.fn(),
            createAndSave: jest.fn(),
            encryptPassword: jest.fn().mockImplementation((pwd) => `encrypted_${pwd}`)
        },
        ParticipantModel: MockParticipantModel
    };
});

jest.mock('../../../models/interviewsPreFill.db.queries', () => ({
    getByReferenceValue: jest.fn()
}));

// Mock the project config to set the postalCodeRegion
jest.mock('evolution-common/lib/config/project.config', () => ({
    postalCodeRegion: 'canada'  // Default for tests
}));

const mockFind = participantAuthModel.find as jest.MockedFunction<typeof participantAuthModel.find>;
const mockCreateAndSave = participantAuthModel.createAndSave as jest.MockedFunction<typeof participantAuthModel.createAndSave>;
const mockGetByReferenceValue = interviewsPreFillQueries.getByReferenceValue as jest.MockedFunction<typeof interviewsPreFillQueries.getByReferenceValue>;

// Apply the auth strategy to passport
byFieldLogin(passport, participantAuthModel);

// req.logIn needs to be set and is called by passport when successful
const logInFct = jest.fn().mockImplementation((_a, _b, callback) => {
    callback();
});

// Initialize test data
const validAccessCode = '1234-1234';
const validPostalCode = 'H2X3Y7';
const preFillAccessCode = '1111-2222';
const preFillPostalCode = 'G1T2R3';
const encryptedPostalCode = `encrypted_${validPostalCode}`;

const mockValidUser = new ParticipantModel({
    id: 5,
    username: validAccessCode,
    password: encryptedPostalCode,
    is_confirmed: true,
    is_valid: true
});

const preFilledResponse = {
    'home.postalCode': {
        value: preFillPostalCode
    },
    'someOtherField': {
        value: 'someValue'
    }
};

const newUserId = 7;

beforeEach(() => {
    logInFct.mockClear();
    mockRecordLogin.mockClear();
    mockFind.mockClear();
    mockFind.mockResolvedValue(undefined); // undefined by default
    mockCreateAndSave.mockClear();
    mockCreateAndSave.mockImplementation(async(attribs) => {
        return new ParticipantModel({
            id: newUserId,
            ...attribs
        });
    });
    mockGetByReferenceValue.mockClear();
    mockGetByReferenceValue.mockResolvedValue(undefined);
});

describe('Auth by Field Login Strategy Tests', () => {
    test('Login with valid existing user', async () => {
        mockFind.mockResolvedValueOnce(mockValidUser);
        const req = {
            logIn: logInFct, 
            body: {
                accessCode: validAccessCode, 
                postalCode: validPostalCode
            }
        };
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(req, {end: jest.fn()}, (err, result) => {
                resolve({ result, err });
            });
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toBeUndefined();
        expect(logInFct).toHaveBeenCalledTimes(1);
        expect(logInFct).toHaveBeenCalledWith(
            { id: mockValidUser.attributes.id, username: mockValidUser.attributes.username, email: undefined, firstName: undefined, lastName: undefined, preferences: {}, serializedPermissions: [] }, 
            expect.anything(), 
            expect.anything()
        );
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ username: `${validAccessCode.toUpperCase()}-${validPostalCode.toUpperCase()}` });
        expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    });

    test('Login with prefilled data match', async () => {
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: preFillAccessCode, 
                        postalCode: preFillPostalCode
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toBeUndefined();
        expect(logInFct).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ username: `${preFillAccessCode.toUpperCase()}-${preFillPostalCode.toUpperCase()}` });
        expect(mockGetByReferenceValue).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).toHaveBeenCalledWith(preFillAccessCode.toUpperCase());
        expect(mockCreateAndSave).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).toHaveBeenCalledWith({
            username: `${preFillAccessCode.toUpperCase()}-${preFillPostalCode.toUpperCase()}`
        });
        expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    });

    test('Login with user confirmation', async () => {
        // No existing user or prefill data, but user confirms it's ok
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: '5555-5555', 
                        postalCode: 'j4r5t6', 
                        confirmCredentials: true
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toBeUndefined();
        expect(logInFct).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).toHaveBeenCalledWith({
            username: expect.stringMatching(/^5555-5555-J4R5T6-[A-Z0-9]{6}$/)
        });
        expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    });

    test('Login attempt with non-existent credentials', async () => {
        // No user, no prefill data, and no confirmation
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: '4444-4444', 
                        postalCode: 'h2e 2e2'
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('FieldCombinationNotFound');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).not.toHaveBeenCalled();
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login attempt with invalid access code', async () => {
        // No user, no prefill data, and no confirmation
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: 'invalid', 
                        postalCode: 'h2e 2e2'
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('InvalidData');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).not.toHaveBeenCalled();
        expect(mockGetByReferenceValue).not.toHaveBeenCalled();
        expect(mockCreateAndSave).not.toHaveBeenCalled();
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login attempt with invalid postal code', async () => {
        // No user, no prefill data, and no confirmation
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: '1111-1111', 
                        postalCode: 'h2e 222'
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('InvalidData');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).not.toHaveBeenCalled();
        expect(mockGetByReferenceValue).not.toHaveBeenCalled();
        expect(mockCreateAndSave).not.toHaveBeenCalled();
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login with database error in authModel find', async () => {
        mockFind.mockRejectedValueOnce(new Error('Database connection error'));
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: validAccessCode, 
                        postalCode: validPostalCode
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('FailedToCreateUser');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).not.toHaveBeenCalled();
        expect(mockCreateAndSave).not.toHaveBeenCalled();
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login with database error in prefill lookup', async () => {
        mockGetByReferenceValue.mockRejectedValueOnce(new Error('Database connection error'));
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: validAccessCode, 
                        postalCode: validPostalCode
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('FailedToCreateUser');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).not.toHaveBeenCalled();
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login with failed user creation', async () => {
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        mockCreateAndSave.mockRejectedValue('Error creating user');
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: preFillAccessCode, 
                        postalCode: preFillPostalCode
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toEqual('FailedToCreateUser');
        expect(authResult.result).toBeFalsy();
        expect(logInFct).not.toHaveBeenCalled();
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockGetByReferenceValue).toHaveBeenCalledTimes(1);
        expect(mockCreateAndSave).toHaveBeenCalledTimes(1);
        expect(mockRecordLogin).not.toHaveBeenCalled();
    });

    test('Login with case-insensitive matching', async () => {
        mockFind.mockResolvedValueOnce(mockValidUser);
        
        const authPromise = new Promise((resolve, reject) => {
            passport.authenticate('auth-by-field')(
                {
                    logIn: logInFct, 
                    body: {
                        accessCode: validAccessCode.toLowerCase(), 
                        postalCode: validPostalCode.toLowerCase()
                    }
                }, 
                {end: jest.fn()}, 
                (err, result) => {
                    resolve({ result, err });
                }
            );
        });
        
        const authResult: any = await authPromise;
        expect(authResult.err).toBeUndefined();
        expect(logInFct).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ username: `${validAccessCode.toUpperCase()}-${validPostalCode.toUpperCase()}` });
        expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    });
});
