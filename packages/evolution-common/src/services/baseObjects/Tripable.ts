/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Tripable is a composition class for objects that can have visited places and/or trips associated with them
 */

import { BaseVisitedPlace } from './BaseVisitedPlace';
import { BaseTrip } from './BaseTrip';

export type Tripable = {

    visitedPlaces?: BaseVisitedPlace[];
    trips?: BaseTrip[];

};
