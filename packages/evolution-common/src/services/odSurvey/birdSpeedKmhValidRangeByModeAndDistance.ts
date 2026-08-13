/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Mode } from './types';
import type { MinMaxRange } from './speedAndDistanceRangesByMode';

/**
 * Distance band in km paired with the plausible bird-speed band in km/h.
 * Audits only: never used to show or hide questionnaire choices.
 * Distance lookup is half-open `[min, max)` so a boundary value (e.g. 1.0 km)
 * uses the next band. Speed comparison is inclusive `[min, max]`.
 */
export type DistanceAndSpeedBand = [distanceKm: MinMaxRange, speedKph: MinMaxRange];

const carLikeBands: DistanceAndSpeedBand[] = [
    [
        [0.0, 1.0],
        [1.0, 90.0]
    ],
    [
        [1.0, 5.0],
        [2.0, 90.0]
    ],
    [
        [5.0, 20.0],
        [6.0, 90.0]
    ],
    [
        [20.0, 50.0],
        [10.0, 100.0]
    ],
    [
        [50.0, 80.0],
        [30.0, 100.0]
    ],
    [
        [80.0, 2000.0],
        [40.0, 110.0]
    ]
];

const urbanTransitBands: DistanceAndSpeedBand[] = [
    [
        [0.0, 5.0],
        [1.0, 50.0]
    ],
    [
        [5.0, 20.0],
        [2.0, 60.0]
    ],
    [
        [20.0, 100.0],
        [10.0, 100.0]
    ]
];

const railTransitBands: DistanceAndSpeedBand[] = [
    [
        [1.0, 5.0],
        [2.0, 50.0]
    ],
    [
        [5.0, 20.0],
        [2.0, 60.0]
    ],
    [
        [20.0, 100.0],
        [10.0, 100.0]
    ]
];

const bicycleLikeBands: DistanceAndSpeedBand[] = [
    [
        [0.0, 1.0],
        [1.0, 25.0]
    ],
    [
        [1.0, 60.0],
        [2.0, 25.0]
    ]
];

/**
 * Bird-speed validity bands by mode and trip distance (km).
 * Audits only (and possible future reviewer validation): never used to show
 * or hide questionnaire choices. Pick the distance band, then check speed.
 */
export const birdSpeedKmhValidRangeByModeAndDistance: Partial<Record<Mode, DistanceAndSpeedBand[]>> = {
    carDriver: carLikeBands,
    carDriverCarsharing: carLikeBands,
    carPassenger: carLikeBands,
    motorcycle: carLikeBands,
    snowmobile: carLikeBands,
    allTerrainVehicle: carLikeBands,
    taxi: [
        [
            [0.0, 1.0],
            [1.0, 90.0]
        ],
        [
            [1.0, 5.0],
            [2.0, 90.0]
        ],
        [
            [5.0, 20.0],
            [5.0, 90.0]
        ],
        [
            [10.0, 50.0],
            [15.0, 100.0]
        ],
        [
            [50.0, 100.0],
            [40.0, 110.0]
        ]
    ],
    transitTaxi: urbanTransitBands,
    transitOnDemand: urbanTransitBands,
    transitBus: urbanTransitBands,
    transitBRT: urbanTransitBands,
    transitStreetCar: urbanTransitBands,
    schoolBus: urbanTransitBands,
    otherBus: urbanTransitBands,
    transitRRT: railTransitBands,
    transitLRT: railTransitBands,
    transitLRRT: railTransitBands,
    transitRegionalRail: railTransitBands,
    transitMonorail: railTransitBands,
    transitHSR: [
        [
            [20.0, 500.0],
            [20.0, 90.0]
        ]
    ],
    walk: [
        [
            [0.0, 1.0],
            [0.5, 11.0]
        ],
        [
            [1.0, 7.0],
            [0.5, 10.0]
        ]
    ],
    bicycle: bicycleLikeBands,
    bicycleElectric: bicycleLikeBands,
    bicyclePassenger: bicycleLikeBands,
    bicycleBikesharing: bicycleLikeBands,
    bicycleBikesharingElectric: bicycleLikeBands,
    kickScooterElectric: bicycleLikeBands,
    otherActiveMode: bicycleLikeBands,
    wheelchair: [
        [
            [0.0, 3.0],
            [0.5, 10.0]
        ]
    ],
    mobilityScooter: [
        [
            [0.0, 5.0],
            [1.0, 15.0]
        ]
    ],
    paratransit: [
        [
            [0.0, 100.0],
            [1.0, 60.0]
        ]
    ],
    intercityBus: [
        [
            [20.0, 500.0],
            [15.0, 90.0]
        ]
    ],
    intercityTrain: [
        [
            [20.0, 500.0],
            [20.0, 90.0]
        ]
    ],
    transitFerry: [
        [
            [0.0, 10.0],
            [2.0, 30.0]
        ]
    ],
    ferryWithCar: [
        [
            [0.0, 10.0],
            [2.0, 30.0]
        ]
    ],
    privateBoat: [
        [
            [0.0, 10.0],
            [2.0, 30.0]
        ]
    ],
    transitGondola: [
        [
            [0.0, 10.0],
            [2.0, 40.0]
        ]
    ],
    transitSchoolBus: urbanTransitBands,
    other: [
        [
            [0.0, 100.0],
            [1.0, 90.0]
        ]
    ],
    dontKnow: [
        [
            [0.0, 100.0],
            [1.0, 120.0]
        ]
    ],
    preferNotToAnswer: [
        [
            [0.0, 100.0],
            [1.0, 120.0]
        ]
    ],
    plane: [
        [
            [200.0, 20000.0],
            [100.0, 1000.0]
        ]
    ]
};

/**
 * Audits only: whether bird speed is plausible for a mode at a given distance.
 * Not used to show or hide questionnaire choices.
 * Distance bands are half-open `[min, max)`: 1.0 km matches `[1.0, 5.0]`,
 * not `[0.0, 1.0]`. Speed is inclusive `>= min` and `<= max`.
 * `wasFound` is false when the mode has no band covering `distanceKm`.
 * @param mode questionnaire mode
 * @param distanceKm trip bird distance in kilometres
 * @param birdSpeedKph trip bird speed in km/h
 */
export const isBirdSpeedInRangeForModeAndDistance = (
    mode: Mode,
    distanceKm: number,
    birdSpeedKph: number
): { wasFound: boolean; inRange: boolean } => {
    const bands = birdSpeedKmhValidRangeByModeAndDistance[mode];
    if (bands === undefined) {
        return { wasFound: false, inRange: false };
    }
    for (const [distanceRange, speedRange] of bands) {
        if (distanceKm >= distanceRange[0] && distanceKm < distanceRange[1]) {
            return {
                wasFound: true,
                inRange: birdSpeedKph >= speedRange[0] && birdSpeedKph <= speedRange[1]
            };
        }
    }
    return { wasFound: false, inRange: false };
};
