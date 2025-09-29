/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { BaseUser } from 'chaire-lib-common/lib/services/user/userType';
import dbQueries from '../../models/participants.db.queries';
import { ParticipantAttributes } from '../participants/participant';
import { AuthModelBase, NewUserParams, UserModelBase } from 'chaire-lib-backend/lib/services/auth/authModel';
import { sendWelcomeEmail } from 'chaire-lib-backend/lib/services/auth/userEmailNotifications';
import config from 'chaire-lib-backend/lib/config/server.config';

export const sanitizeUserAttributes = (attributes: ParticipantAttributes): BaseUser => ({
    id: attributes.id,
    username: attributes.username || '',
    email: typeof attributes.email === 'string' ? attributes.email : undefined,
    preferences: attributes.preferences || {},
    firstName: typeof attributes.first_name === 'string' ? attributes.first_name : undefined,
    lastName: typeof attributes.last_name === 'string' ? attributes.last_name : undefined,
    serializedPermissions: [],
    homePage: undefined
});

class ParticipantAuthModel extends AuthModelBase<ParticipantModel> {
    constructor() {
        super(dbQueries);
    }

    createAndSave = async (userData: NewUserParams): Promise<ParticipantModel> => {
        const userAttribs = await dbQueries.create({
            username: userData.username || null,
            email: userData.email || null,
            google_id: userData.googleId || null,
            facebook_id: userData.facebookId || null,
            password:
                userData.googleId || userData.facebookId || !userData.password
                    ? null
                    : this.encryptPassword(userData.password),
            first_name: '',
            last_name: '',
            is_valid: userData.isTest === true ? false : true,
            is_confirmed: userData.confirmationToken !== undefined ? false : true,
            confirmation_token: userData.confirmationToken !== undefined ? userData.confirmationToken : null,
            is_test: userData.isTest === true
        });
        const user = this.newUser(userAttribs);

        // Send a welcome email to the new user if the server is configured to do so
        if ((config.auth as any)?.welcomeEmail === true) {
            // Send welcome email, no need to wait for it
            sendWelcomeEmail(user);
        }

        return user;
    };

    newUser = (userData: unknown) => new ParticipantModel(userData as ParticipantAttributes);
}

export const participantAuthModel = new ParticipantAuthModel();

export class ParticipantModel extends UserModelBase {
    /** Constructor of the user object. The user MUST exist in the database. To
     * create a new user, use the `UserModel.createAndSave` function */
    constructor(_attributes: ParticipantAttributes) {
        super(_attributes);
    }

    get attributes(): ParticipantAttributes {
        return super.attributes as ParticipantAttributes;
    }

    /**
     * Update participant attributes after sanitizing the data. When participant
     * data comes from client or 'unsafe' sources, use this method instead of
     * 'update' directly.
     *
     * @param {Partial<UserAttributes>} userData Potentially unsafe userData to
     * set
     * @memberof UserModel
     */
    async updateAndSanitizeAttributes(userData: { [key: string]: any }) {
        // Don't just set 'rest', not all attributes can be set, just select those that can
        const changedAttribs: Partial<ParticipantAttributes> = {};
        if (userData.is_test !== undefined) {
            changedAttribs.is_test = userData.is_test === true || userData.is_test === 'true' ? true : false;
        }
        if (userData.is_active !== undefined) {
            changedAttribs.is_active = userData.is_active === true || userData.is_active === 'true' ? true : false;
        }
        if (userData.first_name && typeof userData.first_name === 'string') {
            changedAttribs.first_name = userData.first_name;
        }
        if (userData.last_name && typeof userData.last_name === 'string') {
            changedAttribs.last_name = userData.last_name;
        }
        // TODO Update more data as required
        return await this.updateAndSave(changedAttribs);
    }

    /** Update the current user and save update in the database. `id`, `uuid`
     * and `username` fields cannot be updated */
    async updateAndSave(newAttribs: Partial<Omit<ParticipantAttributes, 'id' | 'username'>>) {
        Object.keys(newAttribs).forEach((key) => {
            this.attributes[key] = newAttribs[key];
        });
        await dbQueries.update(this.attributes.id, newAttribs);
    }

    sanitize = (): BaseUser => {
        return sanitizeUserAttributes(this.attributes);
    };
}
