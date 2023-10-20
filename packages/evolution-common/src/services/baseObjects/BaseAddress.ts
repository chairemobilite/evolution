/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from './Uuidable';

export type BaseAddressAttributes = {
    _uuid?: string;

    civicNumber: number;
    civicNumberSuffix?: string;
    unitNumber?: number;
    streetName: string;
    streetNameHomogenized?: string;
    streetNameId?: string;
    streetNameInternalId?: string;
    municipalityName: string;
    municipalityCode?: string;
    postalMunicipalityName?: string;
    region: string;
    country: string;
    postalCode?: string;
    addressId?: string;
    internalId?: string;
};

export type ExtendendAddressAttributes = BaseAddressAttributes & { [key: string]: any };

export class BaseAddress extends Uuidable {
    civicNumber: number;
    civicNumberSuffix?: string; // A, B, C, etc.
    unitNumber?: number; // appartment number, office number, etc.
    streetName: string; // non abbreviated if possible

    /** homogenized street name:
     * - replace latin characters with their non-latin equivalent
     * - lowercase
     * - no dash
     * - includes non-abbreviated street type/prefix and/or suffix (e.g. "rue", "avenue", "boulevard", etc.)
     * - includes non-abbreviated orientation
     * - non-abbreviated saint/sainte
     * - trimed and trimed start
     * example: rue de la gauchetiere ouest | 5e avenue nord | rang du petit saint jean | 30e rue
     */
    streetNameHomogenized?: string; // homogenized street name, without latin characters, lowercase, no dash.
    streetNameId?: string; // official street name id
    streetNameInternalId?: string; // official street name id used as the primary key for addresses by the survey administrator
    municipalityName: string; // should be taken from an official list if possible
    municipalityCode?: string; // in Quebec, this is always a number
    postalMunicipalityName?: string; // in some places, postal municipality names can be different from official names
    region: string; // province, region or state
    country: string; // should be standardized or ISO 3166-1 alpha-2 code
    postalCode?: string; // should be validated if local postal code format is known
    addressId?: string; // official address id
    internalId?: string; // internal id used as the primary key for addresses by the survey administrator

    constructor(params: BaseAddressAttributes | ExtendendAddressAttributes) {
        super(params._uuid);

        this.civicNumber = params.civicNumber;
        this.civicNumberSuffix = params.civicNumberSuffix;
        this.unitNumber = params.unitNumber;
        this.streetName = params.streetName;
        this.streetNameHomogenized = params.streetNameHomogenized;
        this.streetNameId = params.streetNameId;
        this.streetNameInternalId = params.streetNameInternalId;
        this.municipalityName = params.municipalityName;
        this.municipalityCode = params.municipalityCode;
        this.postalMunicipalityName = params.postalMunicipalityName;
        this.region = params.region;
        this.country = params.country;
        this.postalCode = params.postalCode;
        this.addressId = params.addressId;
        this.internalId = params.internalId;
    }
}
