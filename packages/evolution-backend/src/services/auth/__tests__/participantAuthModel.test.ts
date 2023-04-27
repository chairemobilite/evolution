/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import MockDate from 'mockdate';
import moment from 'moment';

import { participantAuthModel, ParticipantModel, sanitizeUserAttributes } from '../participantAuthModel';
import { ParticipantAttributes } from '../../participants/participant';
import participantsDbQueries from '../../../models/participants.db.queries';

// Mocked date: 2020-09-23, the day we first mocked a date in Transition...
MockDate.set(new Date(1600833600000));

jest.mock('../../../models/participants.db.queries', () => ({
    update: jest.fn(),
    find: jest.fn(),
    getById: jest.fn(),
    create: jest.fn()
}));

const mockSave = participantsDbQueries.update as jest.MockedFunction<typeof participantsDbQueries.update>;
const mockFind = participantsDbQueries.find as jest.MockedFunction<typeof participantsDbQueries.find>
const mockGetById = participantsDbQueries.getById as jest.MockedFunction<typeof participantsDbQueries.getById>;
const mockCreate = participantsDbQueries.create as jest.MockedFunction<typeof participantsDbQueries.create>

const defaultUserId = 5;

const defaultParticipantAttributes = {
    id: 6,
    email: 'foo@test.org',
    username: 'foo',
    first_name: 'Foo',
    last_name: 'Bar',
    is_valid: true,
    is_confirmed: false,
    confirmation_token: 'ThisIsAConfirmationToken',
    profile: null,
    preferences: { lang: 'es' },
    google_id: null,
    facebook_id: null,
    password: 'Randomencryptedpassword',
    password_reset_expire_at: moment('2023-04-24'),
    password_reset_token: 'MyPasswordResetToken',
    is_test: false,
    is_active: true,
    phone_number: '514-555-5555'
};

beforeEach(() => {
    mockSave.mockClear();
    mockFind.mockClear();
    mockCreate.mockClear();
    mockGetById.mockClear();
});

test('sanitizeUserAttributes', () => {
    const username = 'test';
    const first_name = 'first';
    const last_name = 'last';
    const id = 4;
    const preferences = { pref1: 'abc', pref2: true };
    let participantAttributes: ParticipantAttributes = {
        id,
        username,
        first_name,
        last_name
    };
    expect(sanitizeUserAttributes(participantAttributes)).toEqual({
        id,
        username,
        firstName: first_name,
        lastName: last_name,
        preferences: {},
        email: undefined,
        serializedPermissions: []
    });

    // Make sure there is no private data after sanitize
    participantAttributes = {
        id,
        password: '$fdafdsafdafads',
        username,
        email: 'foo@bad.com',
        first_name,
        last_name,
        password_reset_token: 'abcefghi',
        preferences
    };
    expect(sanitizeUserAttributes(participantAttributes)).toEqual({
        id,
        username,
        firstName: first_name,
        lastName: last_name,
        email: participantAttributes.email,
        preferences,
        serializedPermissions: [],
        homepage: undefined
    });
});

describe('ParticipantAuthModel: Account confirmation', () => {
    test('Test valid token confirmation', async () => {
        const token = "thisisanarbitraytoken";
        mockFind.mockResolvedValueOnce({
            id: defaultUserId,
            confirmation_token: token,
            is_confirmed: false
        });
        const result = await participantAuthModel.confirmAccount(token);
        expect(result).toEqual('Confirmed');
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ confirmation_token: token });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(defaultUserId, { confirmation_token: null, is_confirmed: true });
        
    });
    
    test('Test valid token with callback', async () => {
        const token = "thisisanarbitraytoken";
        mockFind.mockResolvedValueOnce({
            id: defaultUserId,
            confirmation_token: token,
            is_confirmed: false
        })
        const callback = jest.fn();
        const result = await participantAuthModel.confirmAccount(token, callback);
        expect(result).toEqual('Confirmed');
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ confirmation_token: token });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(defaultUserId, { confirmation_token: null, is_confirmed: true });
        expect(callback).toHaveBeenCalled();
    });
    
    test('Test invalid token confirmation', async () => {
        const token = "thisisanarbitraytoken";
        mockFind.mockResolvedValueOnce(undefined)
        const result = await participantAuthModel.confirmAccount(token);
        expect(result).toEqual('NotFound');
        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ confirmation_token: token });
        expect(mockSave).toHaveBeenCalledTimes(0);
    });
});

describe('ParticipantAuthModel: Reset password', () => {
    test('Reset password OK', async () => {
        const token = 'thisisanarbitraytoken';
        const newPassword = 'newPassword';
        mockFind.mockResolvedValueOnce({
            id: defaultUserId,
            password_reset_token: token,
            password_reset_expire_at: moment(Date.now() + 86400000),
            password: participantAuthModel.encryptPassword('forgotten')
        });
        const result = await participantAuthModel.resetPassword(token, newPassword);
        expect(result).toEqual('PasswordChanged');

        expect(mockFind).toHaveBeenCalledTimes(1);
        expect(mockFind).toHaveBeenCalledWith({ password_reset_token: token });
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(defaultUserId, {
            password: expect.anything(),
            password_reset_expire_at: null,
            password_reset_token: null
        });
    });
    
    test('Reset password expired', async () => {
        const token = 'thisisanarbitraytoken';
        const newPassword = 'newPassword';
        mockFind.mockResolvedValueOnce({
            id: defaultUserId,
            password_reset_token: token,
            password_reset_expire_at: moment(Date.now() - 86400000),
            password: participantAuthModel.encryptPassword('forgotten')
        });
        const result = await participantAuthModel.resetPassword(token, newPassword);
        expect(result).toEqual('Expired');
        expect(mockSave).not.toHaveBeenCalled();
    });
    
    test('Reset password not found', async () => {
        const token = 'thisisanarbitraytoken';
        const newPassword = 'newPassword';
        mockFind.mockResolvedValueOnce(undefined);
        const result = await participantAuthModel.resetPassword(token, newPassword);
        expect(result).toEqual('NotFound');
        expect(mockSave).not.toHaveBeenCalled();
    });
    
    test('Reset password, no password', async () => {
        const token = 'thisisanarbitraytoken';
        mockFind.mockResolvedValue({
            id: defaultUserId,
            password_reset_token: token,
            password_reset_expire_at: moment(Date.now() + 86400000),
            password: participantAuthModel.encryptPassword('forgotten')
        });
        let result = await participantAuthModel.resetPassword(token);
        expect(result).toEqual('Confirmed');
        expect(mockSave).not.toHaveBeenCalled();
    
        result = await participantAuthModel.resetPassword(token, undefined);
        expect(result).toEqual('Confirmed');
        expect(mockSave).not.toHaveBeenCalled();
    });
});

test('ParticipantAuthModel: newUser', () => {
    const participant = participantAuthModel.newUser(defaultParticipantAttributes);
    expect(JSON.stringify(participant)).toEqual(JSON.stringify(new ParticipantModel(defaultParticipantAttributes)));
});

test('ParticipantAuthModel: getById', async () => {
    // With actual participant
    mockGetById.mockResolvedValueOnce(defaultParticipantAttributes);
    const participant = await participantAuthModel.getById(defaultParticipantAttributes.id);
    expect(JSON.stringify(participant)).toEqual(JSON.stringify(new ParticipantModel(defaultParticipantAttributes)));
    expect(mockGetById).toHaveBeenCalledTimes(1);
    expect(mockGetById).toHaveBeenCalledWith(defaultParticipantAttributes.id);

    // With undefined
    mockGetById.mockResolvedValueOnce(undefined);
    const undefParticipant = await participantAuthModel.getById(100);
    expect(undefParticipant).toBeUndefined();
    expect(mockGetById).toHaveBeenCalledTimes(2);
    expect(mockGetById).toHaveBeenCalledWith(100);
});

describe('ParticipantAuthModel: createAndSave', () => {
    const mockedReturnedAttributes = {
        id: 200,
        username: 'random',
        email: 'foo@bar.com'
    }
    const mockedReturnedParticipant = new ParticipantModel(mockedReturnedAttributes);

    test('Empty participant', async () => {
        mockCreate.mockResolvedValueOnce(mockedReturnedAttributes);
        const newPart = await participantAuthModel.createAndSave({});
        expect(JSON.stringify(newPart)).toEqual(JSON.stringify(mockedReturnedParticipant));
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            username: null,
            email: null,
            google_id: null,
            facebook_id: null,
            password: null,
            first_name: '',
            last_name: '',
            is_valid: true,
            is_confirmed: true,
            confirmation_token: null,
            is_test: false
        });
    });

    test('Complete participant data', async () => {
        const newUserParams = {
            username: 'username',
            email: 'foo@bar.com',
            password: 'motDePasseEnClair',
            isTest: true,
            confirmationToken: 'blabla'
        };
        mockCreate.mockImplementationOnce(async (params) => ({ ...params, id: 7 }));
        const newPart = await participantAuthModel.createAndSave(newUserParams);
        expect(newPart.attributes).toEqual({
            id: 7,
            username: newUserParams.username,
            email: newUserParams.email,
            google_id: null,
            facebook_id: null,
            password: expect.stringContaining('$2a$10$'),
            first_name: '',
            last_name: '',
            is_valid: false,
            is_confirmed: false,
            confirmation_token: newUserParams.confirmationToken,
            is_test: true
        });
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            username: newUserParams.username,
            email: newUserParams.email,
            google_id: null,
            facebook_id: null,
            password: expect.stringContaining('$2a$10$'),
            first_name: '',
            last_name: '',
            is_valid: false,
            is_confirmed: false,
            confirmation_token: newUserParams.confirmationToken,
            is_test: true
        });
        // Verify the password received as argument matches and validates
        const arg = mockCreate.mock.calls[0][0];
        expect(newPart.attributes.password).toEqual(arg.password);
        expect(await newPart.verifyPassword(newUserParams.password)).toEqual(true);
    });

    test('With google and facebook IDs', async () => {
        const newUserParams = {
            username: 'username',
            email: 'foo@bar.com',
            googleId: 'googleId',
            facebookId: 'fbId',
            password: '$fdafdsafdasfda',
            isTest: true,
            confirmationToken: 'blabla'
        };
        mockCreate.mockResolvedValueOnce(mockedReturnedAttributes);
        const newPart = await participantAuthModel.createAndSave(newUserParams);
        expect(JSON.stringify(newPart)).toEqual(JSON.stringify(mockedReturnedParticipant));
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            username: newUserParams.username,
            email: newUserParams.email,
            google_id: newUserParams.googleId,
            facebook_id: newUserParams.facebookId,
            password: null,
            first_name: '',
            last_name: '',
            is_valid: false,
            is_confirmed: false,
            confirmation_token: newUserParams.confirmationToken,
            is_test: true
        });
    });

    test('With an extra id parameter', async () => {
        const newUserParams = {
            username: 'username',
            email: 'foo@bar.com',
            id: 4
        };
        mockCreate.mockResolvedValueOnce(mockedReturnedAttributes);
        const newPart = await participantAuthModel.createAndSave(newUserParams);
        expect(JSON.stringify(newPart)).toEqual(JSON.stringify(mockedReturnedParticipant));
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            username: newUserParams.username,
            email: newUserParams.email,
            google_id: null,
            facebook_id: null,
            password: null,
            first_name: '',
            last_name: '',
            is_valid: true,
            is_confirmed: true,
            confirmation_token: null,
            is_test: false
        });
    });

    test('rejected create call', async () => {
        const newUserParams = {
            username: 'username',
            email: 'foo@bar.com',
            id: 4
        };
        mockCreate.mockRejectedValueOnce('Error');
        let error: any = undefined;
        try {
            await participantAuthModel.createAndSave(newUserParams)
        } catch(err) {
            error = err;
        }
        expect(error).toEqual('Error');
        /*await expect(participantAuthModel.createAndSave(newUserParams))
            .rejects
            .toThrowError('Error');*/

    });
});


describe('ParticipantModel: Password verification', () => {
    test('Test password verification with string password', async () => {
        const password = "test";
        const user = new ParticipantModel({
            id: defaultUserId,
            password: participantAuthModel.encryptPassword(password),
        });
        expect(await user.verifyPassword(password)).toBeTruthy();
        expect(await user.verifyPassword('')).toBeFalsy;
        expect(await user.verifyPassword('Other password')).toBeFalsy();
    });
    
    test('Test password verification with null password', async () => {
        const user = new ParticipantModel({
            id: defaultUserId,
            password: null,
        });
        expect(await user.verifyPassword('')).toBeFalsy;
        expect(await user.verifyPassword('Other password')).toBeFalsy();
    })
    
    test('Test password verification with default user', async () => {
        const user = new ParticipantModel({
            id: defaultUserId
        });
        expect(await user.verifyPassword('')).toBeFalsy;
        expect(await user.verifyPassword('Other password')).toBeFalsy();
    })
});

test('ParticipantModel: Test get display name', async () => {
    const username = 'test';
    const first_name = 'first';
    const last_name = 'last';
    const email = 'test@test.com';
    let user = new ParticipantModel({
        id: defaultUserId,
        password: null,
    });
    expect(user.displayName).toEqual('');

    user = new ParticipantModel({
        id: defaultUserId,
        password: null,
        username,
        email
    });
    expect(user.displayName).toEqual(username);

    user = new ParticipantModel({
        id: defaultUserId,
        password: null,
        username,
        first_name
    });
    expect(user.displayName).toEqual(first_name);

    user = new ParticipantModel({
        id: defaultUserId,
        password: null,
        username,
        last_name
    });
    expect(user.displayName).toEqual(last_name);

    user = new ParticipantModel({
        id: defaultUserId,
        password: null,
        username,
        first_name,
        last_name
    });
    expect(user.displayName).toEqual(first_name + ' ' + last_name);

    user = new ParticipantModel({
        id: defaultUserId,
        password: null,
        username: email,
        email
    });
    expect(user.displayName).toEqual('');

});

test('ParticipantModel: sanitize', () => {
    const username = 'test';
    const first_name = 'first';
    const last_name = 'last';
    const email = 'foo@bar.com';
    const id = 100;
    const preferences = { pref1: 'abc', pref2: true };
    let user = new ParticipantModel({
        id,
        password: null,
        username,
        first_name,
        last_name
    });
    expect(user.sanitize()).toEqual({ id,
        username,
        firstName: first_name,
        lastName: last_name,
        preferences: {},
        email: undefined,
        serializedPermissions: [],
        homePage: undefined
    });

    // Make sure there is no private data after sanitize
    user = new ParticipantModel({
        id,
        password: '$fdafdsafdsafdasfdas',
        username,
        email,
        first_name,
        last_name,
        facebook_id: 'fbid',
        google_id: 'googleid',
        private_token: 'abcefghi',
        preferences,
        phone_number: '514-555-5555',
        is_active: true,
        is_test: true,
        confirm_token: 'confirmationtoken',
        password_reset_expire_at: '2023-04-27 08:44',
        password_reset_token: 'passwordresettoken'
    } as any);

    expect(user.sanitize()).toEqual({
        id,
        username,
        firstName: first_name,
        lastName: last_name,
        preferences,
        email,
        serializedPermissions: [],
        homePage: undefined
    });
});

describe('ParticipantModel: Update attributes', () => {

    const basePartAttribs = {
        id: defaultUserId,
        first_name: 'Foo',
        last_name: 'Bar',
        email: 'foo@bar.com',
        password: '$fdafdasfdas',
        is_test: false,
        is_active: false
    }
    let baseUser = new ParticipantModel(basePartAttribs);

    beforeEach(() => {
        baseUser = new ParticipantModel(basePartAttribs);
    });

    test('is_test', () => {
        // Bad but truthy value
        baseUser.updateAndSanitizeAttributes({ is_test: 'truthy value' });
        expect(baseUser.attributes.is_test).toEqual(false);

        // true
        baseUser.updateAndSanitizeAttributes({ is_test: true });
        expect(baseUser.attributes.is_test).toEqual(true);

        // false
        baseUser.updateAndSanitizeAttributes({ is_test: false });
        expect(baseUser.attributes.is_test).toEqual(false);

        // true as string
        baseUser.updateAndSanitizeAttributes({ is_test: 'true' });
        expect(baseUser.attributes.is_test).toEqual(true);

        // not is_admin value
        baseUser.updateAndSanitizeAttributes({ });
        expect(baseUser.attributes.is_test).toEqual(true);

        // truthy number
        baseUser.updateAndSanitizeAttributes({ is_test: 1 });
        expect(baseUser.attributes.is_test).toEqual(false);
    });

    test('is_active', () => {
        // Bad but truthy value
        baseUser.updateAndSanitizeAttributes({ is_active: 'truthy value' });
        expect(baseUser.attributes.is_active).toEqual(false);

        // true
        baseUser.updateAndSanitizeAttributes({ is_active: true });
        expect(baseUser.attributes.is_active).toEqual(true);

        // false
        baseUser.updateAndSanitizeAttributes({ is_active: false });
        expect(baseUser.attributes.is_active).toEqual(false);

        // true as string
        baseUser.updateAndSanitizeAttributes({ is_active: 'true' });
        expect(baseUser.attributes.is_active).toEqual(true);

        // not is_admin value
        baseUser.updateAndSanitizeAttributes({ });
        expect(baseUser.attributes.is_active).toEqual(true);

        // truthy number
        baseUser.updateAndSanitizeAttributes({ is_active: 1 });
        expect(baseUser.attributes.is_active).toEqual(false);
    });

    test('First/last name', () => {
        // Valid strings
        const name = 'Test'
        baseUser.updateAndSanitizeAttributes({ first_name: name, last_name: name });
        expect(baseUser.attributes.last_name).toEqual(name);
        expect(baseUser.attributes.first_name).toEqual(name);

        // Other value types, should not update
        baseUser.updateAndSanitizeAttributes({ first_name: { name: 'something' }, last_name: 1 });
        expect(baseUser.attributes.last_name).toEqual(name);
        expect(baseUser.attributes.first_name).toEqual(name);

        // First name ok, last name wrong type, only first_name updated
        baseUser.updateAndSanitizeAttributes({ first_name: basePartAttribs.first_name, last_name: 1 });
        expect(baseUser.attributes.last_name).toEqual(name);
        expect(baseUser.attributes.first_name).toEqual(basePartAttribs.first_name);
    });

    test('Test random attributes', () => {
        baseUser.updateAndSanitizeAttributes({ arbitrary: 'some value', other: 'abc' });
        expect(baseUser.attributes).toEqual(basePartAttribs);
    })

});

test('ParticipantModel: properties', () => {

    const user = new ParticipantModel(defaultParticipantAttributes);
    expect(user.id).toEqual(defaultParticipantAttributes.id);
    expect(user.email).toEqual(defaultParticipantAttributes.email);
    expect(user.langPref).toEqual(defaultParticipantAttributes.preferences.lang);
    expect(user.displayName).toEqual(expect.stringContaining(defaultParticipantAttributes.first_name));
    expect(user.passwordResetExpireAt).toEqual(defaultParticipantAttributes.password_reset_expire_at);
    expect(user.confirmationToken).toEqual(defaultParticipantAttributes.confirmation_token);
    expect(user.isConfirmed).toEqual(defaultParticipantAttributes.is_confirmed);
});
