export const noSchoolTripReasonValues = [
    'studyAtHome',
    'noSchool',
    'sickness', // short term
    'parentalLeave', // not always available
    'sickLeave', // not always available
    'holidays',
    'personalReason',
    'strike', // not always available
    'other',
    'dontKnow',
    'didMakeSchoolTrips', // automatically assigned, not shown in choices
    'tripsUnknown', // automatically assigned, not shown in choices
    'usualSchoolPlaceIsHome', // automatically assigned, not shown in choices
    'nonApplicable' // automatically assigned, not shown in choices
] as const;
export type NoSchoolTripReason = (typeof noSchoolTripReasonValues)[number];

export const noWorkTripReasonValues = [
    'workAtHome',
    'noWork',
    'sickness', // short term
    'parentalLeave',
    'sickLeave',
    'holidays',
    'personalReason',
    'strike', // not always available
    'other',
    'dontKnow',
    'didMakeWorkTrips', // automatically assigned, not shown in choices
    'tripsUnknown', // automatically assigned, not shown in choices
    'usualWorkPlaceIsHome', // automatically assigned, not shown in choices
    'nonApplicable' // automatically assigned, not shown in choices
] as const;
export type NoWorkTripReason = (typeof noWorkTripReasonValues)[number];

export const journeyTypeValues = ['dayPart', 'day', 'weekEnd', 'week', 'longDistanceTrip', 'other'] as const;
export type JourneyType = (typeof journeyTypeValues)[number];
