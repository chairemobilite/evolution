/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faTimes,
    faCircleUser,
    faClock,
    faArrowRight,
    faBus,
    faIdCard,
    faCarSide,
    faBicycle
} from '@fortawesome/free-solid-svg-icons';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { secondsSinceMidnightToTimeStr } from 'chaire-lib-common/lib/utils/DateTimeUtils';
import steeringWheelSvg from '../../../assets/images/admin/steering-wheel-solid.svg';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { VisitedPlaceDecorator } from '../../../services/surveyObjectDecorators/VisitedPlaceDecorator';
import KeepDiscard from '../validations/KeepDiscard';
import AuditDisplay from '../AuditDisplay';
import type { ObjectReviewHandlers } from '../validations/objectReviewHandlers';
import { SurveyObjectBox } from './SurveyObjectBox';

export interface PersonPanelProps {
    person: Person;
    journey?: Journey;
    personId: string;
    personIndex?: number;
    audits?: AuditForObject[];
    activeTripUuid?: string;
    activePlacePath?: string;
    selectPlace: (path: string | undefined) => void;
    selectTrip: (uuid: string | undefined) => void;
    keepDiscard: (params: { choice: string; personId: string }) => void;
    showAuditErrorCode?: boolean;
    objectReviewHandlers?: ObjectReviewHandlers;
}

export const PersonPanel = ({
    person,
    journey,
    personId,
    personIndex,
    audits,
    activeTripUuid,
    activePlacePath,
    selectPlace,
    selectTrip,
    keepDiscard,
    showAuditErrorCode,
    objectReviewHandlers
}: PersonPanelProps) => {
    const { t } = useTranslation(['admin']);

    const journeyUuid = journey?._uuid;

    // Handle visited places
    const visitedPlacesStats: JSX.Element[] = [];
    const visitedPlacesArray: VisitedPlace[] = journey?.visitedPlaces || [];

    for (let i = 0, count = visitedPlacesArray.length; i < count; i++) {
        const visitedPlace: VisitedPlace = visitedPlacesArray[i];
        const visitedPlaceDecorator = new VisitedPlaceDecorator(visitedPlace);
        const visitedPlaceId = visitedPlace._uuid!;
        const visitedPlacePath = `response.household.persons.${personId}.journeys.${journeyUuid}.visitedPlaces.${visitedPlaceId}`;
        const visitedPlaceStats = (
            <SurveyObjectBox
                key={visitedPlaceId}
                objectType="visitedPlace"
                objectUuid={visitedPlaceId}
                objectReviewHandlers={objectReviewHandlers}
                extraClassNames="_selectable"
                onClick={() => selectPlace(visitedPlacePath)}
            >
                <span className={`_widget${activePlacePath === visitedPlacePath ? ' _active' : ''}`}>
                    {i + 1}. {visitedPlaceDecorator.getDescription(true)}{' '}
                    {visitedPlace.startTime && visitedPlace.endTime
                        ? '(' + Math.round((10 * (visitedPlace.endTime - visitedPlace.startTime)) / 3600) / 10 + 'h)'
                        : ''}
                </span>
            </SurveyObjectBox>
        );
        visitedPlacesStats.push(visitedPlaceStats);
    }

    // Handle trips
    const tripsStats: JSX.Element[] = [];
    const tripsArray: Trip[] = journey?.trips || [];

    for (let i = 0, count = tripsArray.length; i < count; i++) {
        const trip: Trip = tripsArray[i];
        const tripId = trip._uuid!;

        if (trip.startPlace && trip.endPlace) {
            const startAt = trip.startPlace.endTime as number;
            const endAt = trip.endPlace.startTime as number;
            const duration = !_isBlank(startAt) && !_isBlank(endAt) ? endAt! - startAt! : undefined;

            const segmentsArray: Segment[] = trip.segments || [];
            const segmentsStats: JSX.Element[] = [];

            for (let j = 0, countJ = segmentsArray.length; j < countJ; j++) {
                const segment: Segment = segmentsArray[j];
                const segmentStats: string[] = [];
                if (!_isBlank(segment.mode)) {
                    if (segment.mode === 'carDriver') {
                        segmentStats.push(
                            `(${t('interviewStats.labels.segment.vehicleOccupancy')}: ${segment.vehicleOccupancy ? segment.vehicleOccupancy.toString() : '?'} | ${t('interviewStats.labels.segment.paidForParking')}: ${segment.paidForParking ? segment.paidForParking.toString() : '?'})`
                        );
                    } else if (segment.mode === 'carPassenger') {
                        segmentStats.push(
                            `(${t('interviewStats.labels.segment.driverType')}: ${segment.driverType ? segment.driverType.toString() : '?'})`
                        );
                    } else if (segment.mode === 'transitBus') {
                        segmentStats.push(
                            `(${t('interviewStats.labels.segment.busLines')}: ${segment.busLines ? segment.busLines.join(',') : '?'})`
                        );
                    }
                }
                const segmentId = segment._uuid!;
                segmentsStats.push(
                    <SurveyObjectBox
                        key={segmentId}
                        objectType="segment"
                        objectUuid={segmentId}
                        objectReviewHandlers={objectReviewHandlers}
                    >
                        <strong>{segment.mode || '?'}</strong>: {segmentStats}
                    </SurveyObjectBox>
                );
            }

            const tripStats = (
                <SurveyObjectBox
                    key={tripId}
                    objectType="trip"
                    objectUuid={tripId}
                    objectReviewHandlers={objectReviewHandlers}
                    extraClassNames="_selectable"
                    onClick={() => selectTrip(tripId)}
                >
                    <span key="trip" className={`_widget${activeTripUuid === tripId ? ' _active' : ''}`}>
                        {i + 1}. <FontAwesomeIcon icon={faClock} className="faIconLeft" />
                        {secondsSinceMidnightToTimeStr(startAt)}
                        <FontAwesomeIcon icon={faArrowRight} />
                        {secondsSinceMidnightToTimeStr(endAt)} ({Math.ceil(duration! / 60)} min)
                    </span>
                    <span key="segments" className={`_widget${activeTripUuid === tripId ? ' _active' : ''}`}>
                        {segmentsStats}
                    </span>
                </SurveyObjectBox>
            );
            tripsStats.push(tripStats);
        }
    }

    const hasTripDiary = visitedPlacesStats.length > 0 || tripsStats.length > 0;

    return (
        <SurveyObjectBox
            key={personId}
            as="details"
            open={person._keepDiscard !== 'Discard'}
            objectType="person"
            objectUuid={personId}
            objectReviewHandlers={objectReviewHandlers}
            extraClassNames="_widget_container"
            summary={
                <summary>
                    {personIndex || 1}.{' '}
                    <span
                        style={{
                            display: 'inline-block',
                            width: '1.2rem',
                            height: '1.2rem',
                            borderRadius: '50%',
                            backgroundColor: person._color || '#000000',
                            marginRight: '0.2rem'
                        }}
                    ></span>{' '}
                    {person.gender || person.sexAssignedAtBirth || '?'} • {person.age || '?'}{' '}
                    {t('interviewStats.labels.yearsOld')}
                    <KeepDiscard
                        personId={personId}
                        choice={person._keepDiscard as 'Keep' | 'Discard' | undefined}
                        onChange={(data) => keepDiscard({ choice: data.choice || 'Keep', personId: data.personId })}
                    />
                </summary>
            }
        >
            <span className="_widget">
                <FontAwesomeIcon icon={faCircleUser} className="faIconLeft" />
                {person.age} {t('interviewStats.labels.yearsOld')}
            </span>
            <span className="_widget">{person.gender}</span>
            <span className="_widget">{person.occupation}</span>
            <span className="_widget">
                {person.whoWillAnswerForThisPerson !== person._uuid
                    ? t('interviewStats.labels.proxy')
                    : t('interviewStats.labels.nonProxy')}
            </span>
            <br />

            {journey?.noWorkTripReason && (
                <>
                    <span className="_widget _pale _oblique">{t('interviewStats.labels.noWorkTripReason')}</span>
                    <span className="_widget _pale _oblique">{journey?.noWorkTripReason}</span>
                </>
            )}

            {journey?.noSchoolTripReason && (
                <>
                    <span className="_widget _pale _oblique">{t('interviewStats.labels.noSchoolTripReason')}</span>
                    <span className="_widget _pale _oblique">{journey?.noSchoolTripReason}</span>
                </>
            )}

            <br />
            {journey?.didTrips === 'yes' && (
                <span className="_widget _green">{t('interviewStats.labels.didTrips')}</span>
            )}
            {journey?.didTrips === 'no' && <span className="_widget _green">{t('interviewStats.labels.noTrips')}</span>}
            {journey?.didTrips === 'dontKnow' && (
                <span className="_widget _red">{t('interviewStats.labels.dontKnowTrips')}</span>
            )}
            {person.drivingLicenseOwnership === 'yes' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faCheck} />
                    <img src={steeringWheelSvg} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.drivingLicenseOwnership === 'no' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faTimes} />
                    <img src={steeringWheelSvg} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.drivingLicenseOwnership === 'dontKnow' && (
                <span className="_widget">
                    ?<img src={steeringWheelSvg} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.transitPassOwnership === 'yes' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faCheck} />
                    <FontAwesomeIcon icon={faBus} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.transitPassOwnership === 'no' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faTimes} />
                    <FontAwesomeIcon icon={faBus} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.transitPassOwnership === 'dontKnow' && (
                <span className="_widget">
                    ?<FontAwesomeIcon icon={faBus} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.carsharingMember === 'yes' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faCheck} />
                    <FontAwesomeIcon icon={faCarSide} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.carsharingMember === 'no' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faTimes} />
                    <FontAwesomeIcon icon={faCarSide} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.carsharingMember === 'dontKnow' && (
                <span className="_widget">
                    ?<FontAwesomeIcon icon={faCarSide} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.bikesharingMember === 'yes' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faCheck} />
                    <FontAwesomeIcon icon={faBicycle} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.bikesharingMember === 'no' && (
                <span className="_widget">
                    <FontAwesomeIcon icon={faTimes} />
                    <FontAwesomeIcon icon={faBicycle} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {person.bikesharingMember === 'dontKnow' && (
                <span className="_widget">
                    ?<FontAwesomeIcon icon={faBicycle} />
                    <FontAwesomeIcon icon={faIdCard} />
                </span>
            )}
            {audits && audits.length > 0 && <AuditDisplay audits={audits} showAuditErrorCode={showAuditErrorCode} />}
            {hasTripDiary && journeyUuid && (
                <SurveyObjectBox
                    objectType="journey"
                    objectUuid={journeyUuid}
                    objectReviewHandlers={objectReviewHandlers}
                >
                    {visitedPlacesStats}
                    {tripsStats}
                </SurveyObjectBox>
            )}
        </SurveyObjectBox>
    );
};
