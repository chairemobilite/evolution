# Bird speed and short-trip duration

Two audits apply to the same trip. The bird distance chooses which one runs. Bird speed is bird distance divided by the duration, in km/h. These bounds never apply to questionnaire choices, only to audits.

| Code | Level | Case |
| --- | --- | --- |
| `T_W_ShortTripDuration` | warning | Duration is long for a short distance |
| `T_L_ShortTripDuration` | error | Duration is too long for a short distance |
| `T_W_SpeedNotInRange` | warning | Speed is outside the warning range |
| `T_L_SpeedNotInRange` | error | Speed is outside the error range |

A speed equal to a bound is accepted. It is outside the range only when it is strictly below the minimum or strictly above the maximum. The error range is checked first: when both ranges are exceeded, the result is an error.

## Which check runs, by distance

Active modes are walk, bicycle (including electric, passenger, and bikesharing), electric kick scooter, wheelchair, and `otherActiveMode`. Their cutoff is 500 m. Every other mode has a cutoff of 1 km.
**These are still arbitrary distance thresholds that we should refine in the future wiht more declared data.**

The short-duration audit applies at the cutoff and below. The speed audit applies strictly above it.

| Bird distance | Active mode alone | Non-active mode alone |
| --- | --- | --- |
| Under 500 m | Duration | Duration |
| 500 m | Duration | Duration |
| Over 500 m and under 1 km | Speed | Duration |
| 1 km | Speed | Duration |
| Over 1 km | Speed | Speed |

The minute bounds are the same for every short trip. Only the distance cutoff changes.

| Duration | Result |
| --- | --- |
| Under 20 min | Accepted |
| From 20 min up to, but not including, 45 min | warning: `T_W_ShortTripDuration` |
| 45 min or more | error: `T_L_ShortTripDuration` |

A duration of 0 does not raise the duration audit. The speed audit handles it, below.

## Duration of 0

A duration of 0 is ignored up to 1 km inclusive for every mode, and up to 5 km inclusive for car (driver, passenger, and carsharing) and motorcycle. Taxi does not get the 5 km limit.
In the questionnaire, we accept the same departure and arrival time for trips and activities, so duration of 0 should be accepted for short distances.
**The max distances are still arbitrary thresholds that we should refine in the future wiht more declared data.**

Beyond that, the trip gets `T_L_SpeedNotInRange` without a speed calculation.

With several modes, a duration of 0 is ignored only when every mode ignores it at that distance. Walk and car at 2 km are not ignored: walk is ignored only up to 1 km. Car and motorcycle at 4 km are ignored, because both go up to 5 km.

## Several modes: which distance

Duration uses the larger cutoff. One non-active segment selects 1 km. A trip whose modes are all active keeps the 500 m rule.

Speed runs when at least one mode is past its own cutoff. The bounds applied are those of every mode that is kept, not only the mode that started the audit.

A trip that includes both walk and car, from just over 500 m up to 1 km, gets the speed audit and the duration audit at the same time. The speed audit runs because walk is past 500 m. The duration audit runs because car is still at or under 1 km. Car alone at 1 km gets only the duration audit. Walk alone at 800 m gets only the speed audit.

## Several modes: which speed bounds

Three rules, in this order.

1. The same mode repeated (bus, bus, bus) keeps that mode's bounds.
2. Different modes combine their speed bounds as an envelope: the lowest minimum and the highest maximum of the modes that are kept. A speed is accepted when it falls inside that range, bounds included. Duration does not use this envelope. Several modes only change the distance cutoff of the duration audit, and every short trip uses the same 20 and 45 minute bounds.
3. When the trip contains a plane (`plane`), an intercity bus (`intercityBus`), an intercity train (`intercityTrain`), or high-speed rail (`transitHSR`), local modes are dropped. Those long-distance modes still combine with each other. Regional rail (`transitRegionalRail`) stays a local mode.

A missing bound is not checked. This would happen if a mode is added but not the associated speed bounds.

Examples, bird distancve speeds (km/h):

| Modes | Speed | Result | Why |
| --- | --- | --- | --- |
| Three buses | 4 | Warning | Warning outside 5 to 50, error outside 1 to 100. |
| Walk and bus | 4 | Accepted | Warning outside 2 to 50, error outside 0.5 to 100. |
| Walk and bus | 60 | Warning | Warning outside 2 to 50, error outside 0.5 to 100. |
| Car and `transitLRRT` | 5 | Warning | Warning outside 6 to 120, error outside 2 to 150. |
| Car and `transitLRRT` | 130 | Warning | Warning outside 6 to 120, error outside 2 to 150. |
| Bus and metro (`transitRRT`) | 130 | Error | Warning outside 3 to 50, error outside 1 to 120. |
| Walk and plane | 10 | Error | Warning outside 60 to 1000, error outside 15 to 1200. |
| Car and intercity bus | 100 | Warning | Warning outside 15 to 90, error outside 5 to 120. |
| Car and high-speed rail | 20 | Warning | Warning outside 30 to 300, error outside 10 to 400. |
| Walk, plane, and intercity bus | 10 | Warning | Warning outside 15 to 1000, error outside 5 to 1200. |

## Access walking

On a trip that has at least one other mode, the factory removes walking segments before the audits, when the segment sequences are valid. Walking to the car or to the stop therefore does not enter the bounds. A walk-only trip, or a trip made only of walking segments, keeps them.

When a sequence is invalid or duplicated, the raw segments stay, including walking, so that `T_L_InvalidSegmentSequences` can report the problem. In that case walking is part of the envelope.

## Speed bounds by mode

Inclusive minimum and maximum, in km/h. The left column is the warning, the right column is the error.
These are bird distance speeds, so for instance jogging at 10 km/h would not trigger a warning because the real network speed will be lower.
**Distance thresholds (500m, 1km, etc.) are arbitrary for now, until we get enough data to make better thresholds based on declared durations and distances.**

### Active modes, speed above 500 m

| Mode | Warning | Error |
| --- | --- | --- |
| `walk` | 2 to 10 | 0.5 to 15 |
| `bicycle`, `bicycleBikesharing` | 4 to 25 | 0.5 to 40 |
| `bicyclePassenger` | 4 to 25 | 0.5 to 50 |
| `bicycleElectric`, `bicycleBikesharingElectric`, `kickScooterElectric` | 4 to 30 | 0.5 to 50 |
| `wheelchair` | 1 to 10 | 0.5 to 10 |
| `otherActiveMode` | 2 to 25 | 0.5 to 50 |

For a wheelchair, the warning maximum and the error maximum are both 10. Going over 10 is therefore an error.

### Other modes, speed above 1 km

| Mode | Warning | Error |
| --- | --- | --- |
| `carDriver`, `carDriverCarsharing`, `carPassenger`, `motorcycle` | 6 to 120 | 2 to 150 |
| `taxi` | 6 to 110 | 2 to 150 |
| `mobilityScooter` | 2 to 25 | 0.5 to 40 |
| `paratransit` | 5 to 60 | 1 to 100 |
| `snowmobile` | 5 to 70 | 1 to 100 |
| `privateBoat` | 2 to 50 | 0.5 to 100 |
| `allTerrainVehicle` | 5 to 60 | 1 to 100 |
| `transitBus` | 5 to 50 | 1 to 100 |
| `transitBRT` | 5 to 60 | 1 to 70 |
| `transitSchoolBus` | 5 to 40 | 1 to 120 |
| `transitStreetCar` | 7 to 40 | 1 to 100 |
| `transitFerry` | 2 to 40 | 0.5 to 90 |
| `transitGondola` | 3 to 40 | 0.5 to 50 |
| `transitMonorail` | 5 to 50 | 3 to 120 |
| `transitRRT` | 3 to 50 | 1 to 120 |
| `transitLRT` | 3 to 60 | 1 to 100 |
| `transitLRRT` | 8 to 100 | 2 to 150 |
| `transitRegionalRail` | 10 to 120 | 5 to 250 |
| `transitOnDemand` | 5 to 80 | 1 to 100 |
| `transitTaxi` | 5 to 80 | 2 to 150 |
| `schoolBus` | 5 to 80 | 1 to 120 |
| `otherBus` | 5 to 110 | 1 to 120 |
| `ferryWithCar` | 2 to 40 | 0.5 to 90 |
| `other`, `dontKnow`, `preferNotToAnswer` | 2 to 100 | 0.5 to 1200 |

### Long-distance modes

These modes replace local modes as soon as one of them is present. Speed is audited above 1 km, like the other non-active modes.

| Mode | Warning | Error |
| --- | --- | --- |
| `plane` | 60 to 1000 | 15 to 1200 |
| `intercityBus` | 15 to 90 | 5 to 120 |
| `intercityTrain` | 20 to 200 | 5 to 350 |
| `transitHSR` | 30 to 300 | 10 to 400 |

The values live in [`packages/evolution-backend/src/services/audits/auditChecks/checks/birdSpeedAuditRangesByMode.ts`](auditChecks/checks/birdSpeedAuditRangesByMode.ts). The checks are called from [`packages/evolution-backend/src/services/audits/auditChecks/checks/TripAuditChecks.ts`](auditChecks/checks/TripAuditChecks.ts).
