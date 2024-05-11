/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../../types/Optional.type';
import { ParamsValidatorUtils } from '../../../utils/ParamsValidatorUtils';
import { Routing, RoutingAttributes, routingAttributes } from './Routing';
import { Result, createErrors, createOk } from '../../../types/Result.type';
import { SingleRouteResult as TrRoutingRoute } from 'chaire-lib-common/lib/api/TrRouting/trRoutingApiV2';

export const transitRoutingAttributes = [
    ...routingAttributes
];

export type TransitRoutingAttributes = {
    route?: Optional<TrRoutingRoute>; // overrides RoutingAttributes route, TODO: create a generic transit route result
} & RoutingAttributes;

export type ExtendedTransitRoutingAttributes = TransitRoutingAttributes & { [key: string]: unknown };

export class TransitRouting extends Routing<TransitRoutingAttributes> {

    static _confidentialAttributes = [];

    constructor(params: TransitRoutingAttributes | ExtendedTransitRoutingAttributes) {
        super(params, transitRoutingAttributes);
        this._attributes.mode = 'transit';
    }

    // params must be sanitized and must be valid:
    static unserialize(params: ExtendedTransitRoutingAttributes): TransitRouting {
        return new TransitRouting(params);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns TransitRouting | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<TransitRouting> {
        const errors = TransitRouting.validateParams(dirtyParams);
        const transitRouting = errors.length === 0 ? new TransitRouting(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(transitRouting as TransitRouting);
    }

    /**
     * Validates attributes types for TransitRouting.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'TransitRouting'): Error[] {
        const errors: Error[] = [];

        const routeParams = dirtyParams.route as { [key: string]: unknown };
        dirtyParams.route = undefined; // route is not of same type in Routing
        errors.push(...Routing.validateParams(dirtyParams, displayName));
        dirtyParams.route = routeParams;

        // Validate route object:
        // TODO: verify all attributes from the route object
        errors.push(...ParamsValidatorUtils.isObject(
            'route',
            dirtyParams.route,
            displayName
        ));

        return errors;
    }
}
