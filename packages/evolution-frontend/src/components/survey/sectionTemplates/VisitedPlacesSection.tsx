/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { ReactNode } from 'react';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';

import { GroupedObject } from '../../survey/GroupWidgets';
import { Widget } from '../../survey/Widget';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { roundToDecimals } from 'chaire-lib-common/lib/utils/MathUtils';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { type SectionProps, useSectionTemplate } from '../../hooks/useSectionTemplate';
import { SurveyContext } from '../../../contexts/SurveyContext';
import { secondsSinceMidnightToTimeStrWithSuffix } from '../../../services/display/frontendHelper';
import type { GroupConfig, VisitedPlace } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getActivityIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';

const percentLengthOfOneSecond = 100.0 / (28 * 3600);

export const VisitedPlacesSection: React.FC<SectionProps> = (props: SectionProps) => {
    const { preloaded } = useSectionTemplate(props);
    const [confirmDeleteVisitedPlace, setConfirmDeleteVisitedPlace] = React.useState<string | null>(null);
    const surveyContext = React.useContext(SurveyContext);
    const { t, i18n } = useTranslation(['main', 'visitedPlaces']);

    const addVisitedPlace = (sequence: number, path: string, e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) {
            e.preventDefault();
        }
        const person = odHelpers.getPerson({ interview: props.interview }) as any;
        const currentJourney = odHelpers.getActiveJourney({ interview: props.interview, person });
        if (!person || !currentJourney) {
            return;
        }
        // Add a new place at sequence
        odHelpers.addVisitedPlace({
            person,
            journey: currentJourney,
            insertSequence: sequence,
            startUpdateInterview: props.startUpdateInterview,
            startAddGroupedObjects: props.startAddGroupedObjects
        });
    };

    const selectVisitedPlace = (
        visitedPlaceUuid: string,
        e?: React.MouseEvent<HTMLElement, MouseEvent> | undefined
    ) => {
        if (e) {
            e.preventDefault();
        }
        props.startUpdateInterview({
            sectionShortname: 'visitedPlaces',
            valuesByPath: { ['response._activeVisitedPlaceId']: visitedPlaceUuid }
        });
    };

    const deleteVisitedPlace = (visitedPlacePath: string, e?: React.MouseEvent<Element, MouseEvent> | undefined) => {
        if (e) {
            e.preventDefault();
        }
        const person = odHelpers.getPerson({ interview: props.interview });
        const journey = odHelpers.getActiveJourney({ interview: props.interview, person });
        if (!journey || !person) {
            return;
        }
        const visitedPlace = getResponse(props.interview, visitedPlacePath, null) as VisitedPlace;
        odHelpers.deleteVisitedPlace({
            interview: props.interview,
            person,
            journey,
            visitedPlace,
            startUpdateInterview: props.startUpdateInterview,
            startRemoveGroupedObjects: props.startRemoveGroupedObjects
        });
    };

    if (!preloaded) {
        return <LoadingPage />;
    }

    // Prepare required data
    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    const widgetsComponentsByShortname = {};
    const personVisitedPlacesConfig = surveyContext.widgets['personVisitedPlaces'] as GroupConfig;
    const person = odHelpers.getPerson({ interview: props.interview });
    const currentJourney = odHelpers.getActiveJourney({ interview: props.interview, person });
    const interviewablePersons = odHelpers.getInterviewablePersonsArray({ interview: props.interview });

    if (!person || !currentJourney) {
        throw new Error('Person or current journey not found for visited places section');
    }

    // setup schedules for all interviewable persons:
    // FIXME Extract to a function component, the for loop has a lot of variables in common with the main block

    const widgetsSchedules: ReactNode[] = [];

    let activePersonSchedule: ReactNode | null = null;
    const selectedVisitedPlaceId = odHelpers.getActiveVisitedPlace({
        interview: props.interview,
        journey: currentJourney
    })?._uuid;

    // For each interviewable person, create a schedule component for them if they have visited places. This is a time line with blocks for each visited place
    // FIXME Extract to its own function component
    for (let i = 0; i < interviewablePersons.length; i++) {
        const personForSchedule = interviewablePersons[i];
        const isPersonActive = personForSchedule._uuid === person._uuid;
        let atLeastOneCompletedVisitedPlace = false;
        const journeysForSchedule = odHelpers.getJourneysArray({ person: personForSchedule });
        const journeyForSchedule = journeysForSchedule[0];
        const visitedPlacesForSchedule =
            journeyForSchedule !== undefined ? odHelpers.getVisitedPlacesArray({ journey: journeyForSchedule }) : [];
        const personVisitedPlacesSchedules: ReactNode[] = [];
        for (let i = 0, count = visitedPlacesForSchedule.length; i < count; i++) {
            const visitedPlace = visitedPlacesForSchedule[i];
            const visitedPlaceDescription = odHelpers.getVisitedPlaceDescription({
                visitedPlace,
                person: personForSchedule,
                interview: props.interview,
                t,
                options: { withTimes: true, allowHtml: false, withPersonIdentification: false }
            });
            let departureTime = i === count - 1 ? 28 * 3600 : null;
            let arrivalTime = i === 0 ? 0 : null;
            if (visitedPlace.departureTime) {
                departureTime = visitedPlace.departureTime;
            }
            if (visitedPlace.arrivalTime) {
                arrivalTime = visitedPlace.arrivalTime;
            }
            if (visitedPlace.activity && !_isBlank(departureTime) && !_isBlank(arrivalTime)) {
                atLeastOneCompletedVisitedPlace = true;
            } else {
                continue;
            }
            if (arrivalTime === null || departureTime === null) {
                continue;
            }
            const startAtPercent = roundToDecimals(arrivalTime * percentLengthOfOneSecond, 4) as number;
            const width = roundToDecimals(departureTime * percentLengthOfOneSecond - startAtPercent, 4) as number;
            const visitedPlaceSchedule = (
                <div
                    className={`survey-visited-places-schedule-visited-place${isPersonActive && !selectedVisitedPlaceId ? ' hand-cursor-on-hover' : ''}`}
                    key={visitedPlace._uuid}
                    style={{ left: startAtPercent.toString() + '%', width: width.toString() + '%' }}
                    title={visitedPlaceDescription}
                    onClick={
                        props.interview.allWidgetsValid && isPersonActive && !selectedVisitedPlaceId
                            ? (e) => selectVisitedPlace(visitedPlace._uuid, e)
                            : undefined
                    }
                >
                    <div className="survey-visited-places-schedule-visited-place-icon">
                        <img
                            src={getActivityIcon(visitedPlace.activity)}
                            style={{ height: '1.8em', padding: '0.1em' }}
                            alt={visitedPlace.activity ? t(`visitedPlaces:activities:${visitedPlace.activity}`) : ''}
                        />
                        <p>
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem' }} />
                            {typeof visitedPlace.arrivalTime === 'number' &&
                                secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.arrivalTime, t('main:theNextDay'))}
                            {typeof visitedPlace.departureTime === 'number' && (
                                <FontAwesomeIcon
                                    icon={faArrowRight}
                                    style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }}
                                />
                            )}
                            {typeof visitedPlace.departureTime === 'number' &&
                                secondsSinceMidnightToTimeStrWithSuffix(
                                    visitedPlace.departureTime,
                                    t('main:theNextDay')
                                )}
                        </p>
                    </div>
                </div>
            );
            personVisitedPlacesSchedules.push(visitedPlaceSchedule);
        }
        // Only display the schedule if the person has at least one completed visited place (with activity and times)
        if (atLeastOneCompletedVisitedPlace) {
            const personSchedule = (
                <div className="survey-visited-places-schedule-person-container" key={personForSchedule._uuid}>
                    {
                        <p className={personForSchedule._uuid === person._uuid ? 'HTML _orange' : ''}>
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: t('visitedPlaces:dayScheduleFor', {
                                        nickname: odHelpers.getPersonIdentificationString({
                                            person: personForSchedule,
                                            t
                                        }),
                                        count: interviewablePersons.length
                                    })
                                }}
                            />
                        </p>
                    }
                    <div className="survey-visited-places-schedule-person">{personVisitedPlacesSchedules}</div>
                </div>
            );
            // Add the active person schedule at the end to ensure it is closest to the visited places list
            if (isPersonActive) {
                activePersonSchedule = personSchedule;
            } else {
                widgetsSchedules.push(personSchedule);
            }
        }
    }
    // Put the active person schedule at the end
    if (activePersonSchedule) {
        widgetsSchedules.push(activePersonSchedule);
    }

    // Create widgets components to display later
    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++) {
        const widgetShortname = props.sectionConfig.widgets[i];

        widgetsComponentsByShortname[widgetShortname] = (
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={props.sectionConfig.widgets[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                startNavigate={props.startNavigate}
            />
        );
    }

    // setup visited places:

    const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey: currentJourney });
    const lastVisitedPlace = visitedPlaces.length > 0 ? visitedPlaces[visitedPlaces.length - 1] : null;
    const visitedPlacesList: ReactNode[] = [];
    // For each visited place of the active journey, create a list of items with
    // the place description and times. This is a one-row component for each
    // place, except the selected one which will be expanded with a complete
    // form to edit it.
    // FIXME Extract to its own function component
    for (let i = 0, count = visitedPlaces.length; i < count; i++) {
        const visitedPlace = visitedPlaces[i] as any;
        const isPlaceSelected = selectedVisitedPlaceId && visitedPlace._uuid === selectedVisitedPlaceId;
        const activity = visitedPlace.activity;
        const actualVisitedPlace = visitedPlace.shortcut
            ? getResponse(props.interview, visitedPlace.shortcut, visitedPlace)
            : visitedPlace;
        const visitedPlacePath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces.${visitedPlace._uuid}`;
        const visitedPlaceItem = (
            <li
                className={`no-bullet survey-visited-place-item${isPlaceSelected ? ' survey-visited-place-item-selected' : ''}`}
                key={`survey-visited-place-item__${i}`}
            >
                <span className="survey-visited-place-item-element survey-visited-place-item-sequence-and-icon">
                    {visitedPlace._sequence}.{' '}
                    {activity && (
                        <div className="survey-visited-place-item-icon-container">
                            <img
                                src={getActivityIcon(activity)}
                                style={{ height: '3rem' }}
                                alt={activity ? t(`visitedPlaces:activities:${activity}`) : ''}
                            />
                        </div>
                    )}
                </span>
                <span className="survey-visited-place-item-element survey-visited-place-item-description text-box-ellipsis">
                    <span className={isPlaceSelected ? '_strong' : ''}>
                        {activity && t(`visitedPlaces:activities:${activity}`)}
                        {actualVisitedPlace.name && <em>&nbsp;• {actualVisitedPlace.name}</em>}
                    </span>
                </span>

                {
                    <span className="survey-visited-place-item-element survey-visited-place-item-buttons">
                        <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem', marginLeft: '0.6rem' }} />
                        {visitedPlace.arrivalTime &&
                            secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.arrivalTime, t('main:theNextDay'))}
                        {visitedPlace.departureTime && (
                            <FontAwesomeIcon
                                icon={faArrowRight}
                                style={{ marginRight: '0.3rem', marginLeft: '0.3rem' }}
                            />
                        )}
                        {visitedPlace.departureTime &&
                            secondsSinceMidnightToTimeStrWithSuffix(visitedPlace.departureTime, t('main:theNextDay'))}
                        {!selectedVisitedPlaceId /*state.editActivated*/ && props.loadingState === 0 && (
                            <button
                                type="button"
                                className={'survey-section__button button blue small'}
                                onClick={(e) => selectVisitedPlace(visitedPlace._uuid, e)}
                                style={{ marginLeft: '0.5rem' }}
                                title={t('visitedPlaces:editVisitedPlace')}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} className="" />
                                {/*props.t('visitedPlaces:editVisitedPlace')*/}
                            </button>
                        )}
                        {!selectedVisitedPlaceId /*state.editActivated*/ &&
                            props.loadingState === 0 &&
                            visitedPlaces.length > 1 && (
                            <button
                                type="button"
                                className={'survey-section__button button red small'}
                                onClick={(_e) => setConfirmDeleteVisitedPlace(visitedPlacePath)}
                                title={t('visitedPlaces:deleteVisitedPlace')}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} className="" />
                                {/*props.t('visitedPlaces:deleteVisitedPlace')*/}
                            </button>
                        )}
                        {/* FIXME In od_nationale_2024, there is an extra widget dependent on the validating user to merge places */}
                        {/* confirmPopup below: */}
                        {confirmDeleteVisitedPlace === visitedPlacePath && (
                            <div>
                                <ConfirmModal
                                    isOpen={true}
                                    closeModal={() => setConfirmDeleteVisitedPlace(null)}
                                    text={
                                        personVisitedPlacesConfig.deleteConfirmPopup?.content
                                            ? (surveyHelper.translateString(
                                                personVisitedPlacesConfig.deleteConfirmPopup.content,
                                                i18n,
                                                props.interview,
                                                props.shortname
                                            ) as string)
                                            : t('visitedPlaces:ConfirmDeleteVisitedPlace')
                                    }
                                    title={
                                        personVisitedPlacesConfig.deleteConfirmPopup?.title
                                            ? (surveyHelper.translateString(
                                                personVisitedPlacesConfig.deleteConfirmPopup.title,
                                                i18n,
                                                props.interview,
                                                props.shortname
                                            ) as string)
                                            : t('visitedPlaces:deleteThisGroupedObject')
                                    }
                                    confirmAction={(e) => deleteVisitedPlace(visitedPlacePath, e)}
                                    containsHtml={personVisitedPlacesConfig.deleteConfirmPopup?.containsHtml ?? false}
                                />
                            </div>
                        )}
                    </span>
                }
            </li>
        );

        visitedPlacesList.push(visitedPlaceItem);

        // If the place is selected, add the grouped object component for that place
        if (selectedVisitedPlaceId && isPlaceSelected) {
            const parentObjectIds = {};
            parentObjectIds['personVisitedPlaces'] = visitedPlace._uuid;
            const selectedVisitedPlaceComponent = (
                <li
                    className="no-bullet"
                    style={{ marginTop: '-0.4rem' }}
                    key={`survey-visited-place-item-selected__${i}`}
                >
                    <GroupedObject
                        widgetConfig={personVisitedPlacesConfig}
                        shortname="personVisitedPlaces"
                        path={visitedPlacePath}
                        loadingState={props.loadingState}
                        objectId={visitedPlace._uuid}
                        parentObjectIds={parentObjectIds}
                        key={`survey-visited-place-item-selected-${visitedPlace._uuid}`}
                        sequence={visitedPlace['_sequence']}
                        section={'visitedPlaces'}
                        interview={props.interview}
                        user={props.user}
                        errors={props.errors}
                        startUpdateInterview={props.startUpdateInterview}
                        startAddGroupedObjects={props.startAddGroupedObjects}
                        startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                        startNavigate={props.startNavigate}
                    />
                </li>
            );
            visitedPlacesList.push(selectedVisitedPlaceComponent);
        }

        // Add a button to insert a visited place after the list of places when all list is complete
        if (
            !selectedVisitedPlaceId &&
            props.loadingState === 0 &&
            visitedPlaces.length > 1 &&
            ((lastVisitedPlace && lastVisitedPlace._uuid !== visitedPlace._uuid) ||
                (lastVisitedPlace?._uuid === visitedPlace._uuid &&
                    visitedPlace.nextPlaceCategory === 'stayedThereUntilTheNextDay'))
        ) {
            visitedPlacesList.push(
                <li
                    className="no-bullet survey-visited-place-insert"
                    key={`survey-visited-place-item-insert-after__${i}`}
                    style={{ marginTop: '-0.4em', marginLeft: '2rem', padding: 0 }}
                >
                    <button
                        type="button"
                        className="button blue center small"
                        onClick={(e) =>
                            addVisitedPlace(
                                visitedPlace['_sequence'] + 1,
                                `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                                e
                            )
                        }
                        title={t('visitedPlaces:insertVisitedPlace')}
                    >
                        <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                        {t('visitedPlaces:insertVisitedPlace')}
                    </button>
                </li>
            );
        }
    }
    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            <div className="survey-section__content">
                {widgetsComponentsByShortname['activePersonTitle']}
                {widgetsComponentsByShortname['buttonSwitchPerson']}
                <div className="survey-visited-places-schedules">{widgetsSchedules}</div>
                <div className="survey-visited-places-list-and-map-container">
                    <ul
                        className={`survey-visited-places-list ${selectedVisitedPlaceId || visitedPlaces.length <= 1 ? 'full-width' : ''}`}
                    >
                        <li className="no-bullet">{widgetsComponentsByShortname['personVisitedPlacesTitle']}</li>
                        {visitedPlacesList}
                        {!selectedVisitedPlaceId && // Add the button to add next location when there is no selected place, but the list is not complete
                            ((lastVisitedPlace &&
                                (lastVisitedPlace as any).nextPlaceCategory !== 'stayedThereUntilTheNextDay') ||
                                visitedPlaces.length === 1) &&
                            props.loadingState === 0 && (
                            <li className="no-bullet">
                                <button
                                    type="button"
                                    className="button blue center large"
                                    onClick={(e) =>
                                        addVisitedPlace(
                                            -1,
                                            `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.visitedPlaces`,
                                            e
                                        )
                                    }
                                    title={t('visitedPlaces:addVisitedPlace')}
                                >
                                    <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                                    {t('visitedPlaces:addVisitedPlace')}
                                </button>
                            </li>
                        )}
                    </ul>
                    {!selectedVisitedPlaceId && visitedPlaces.length > 1 && (
                        <div className={'survey-visited-places-map'}>
                            {widgetsComponentsByShortname['personVisitedPlacesMap']}
                        </div>
                    )}
                </div>
                {/* This confirm button is placed here to ensure it is visible on mobile devices after the map */}
                {visitedPlaces.length > 1 &&
                    !selectedVisitedPlaceId &&
                    widgetsComponentsByShortname['buttonVisitedPlacesConfirmNextSection']}
            </div>
        </section>
    );
};

export default VisitedPlacesSection;
