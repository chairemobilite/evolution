/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type Audit = {
    /**
     * Indicate the current version of a validation. If the validation changes, the version will change
     */
    version: number;
    /**
     * Whether this audit message is simply a warning or an error. Defaults to false
     */
    isWarning?: boolean;
    /**
     * The code of this validation. It should be unique per interview object.
     */
    errorCode: string;
    /**
     * A valid i18n key to translate this message. If not set, the errorCode will be used as the i18n key.
     */
    message?: string;
    /**
     * Whether to ignore this validation in the interface. Defaults to false
     */
    ignore?: boolean;
};

export type AuditForObject = Audit & {
    /**
     * The type of the object this audit applies to. Can be 'interview', 'home', 'person', 'household', etc.
     */
    objectType: string;
    /**
     * The object's UUID. If the object is a single object without a specific uuid, like the interview or household, the interview's uuid is used for this field.
     */
    objectUuid: string;
};

export type Audits = { [key: string]: Audit };
