/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    StartUpdateInterview,
    UserRuntimeInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import { InterviewPanel } from '../widgets/InterviewPanel';
import { HomePanel } from '../widgets/HomePanel';
import { HouseholdPanel } from '../widgets/HouseholdPanel';
import { PersonPanel } from '../widgets/PersonPanel';
import AuditDisplay from '../AuditDisplay';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

// TODO This component should be replaced by the v2 audits that come from the server and uses an object to validate the survey.

export type InterviewStatsPrefs = {
    showAuditErrorCode: boolean; // if true, will show audit error codes instead of translated messages
};

export type InterviewStatsProps = {
    startUpdateInterview: StartUpdateInterview;
    interview: UserRuntimeInterviewAttributes;
    surveyObjectsAndAudits?: SurveyObjectsWithAudits;
    user: CliUser;
    activeTripUuid?: string;
    selectPlace: (path: string | undefined) => void;
    selectTrip: (uuid: string | undefined) => void;
    activePlacePath?: string;
    prefs?: InterviewStatsPrefs;
    toggleAuditErrorCode?: () => void;
    validationDataDirty?: boolean;
};

const InterviewStats = (props: InterviewStatsProps) => {
    const { t } = useTranslation(['admin']);

    const keepDiscard = ({ choice, personId }) => {
        const valuesByPath = {};
        valuesByPath[`response.household.persons.${personId}._keepDiscard`] = choice;
        props.startUpdateInterview({ valuesByPath });
    };

    // Use unserialized objects - show error if not available
    const surveyObjects = props.surveyObjectsAndAudits;

    // Debug logging
    if (!surveyObjects) {
        console.error('❌ InterviewStats - No survey objects available');
        return (
            <div className="admin__interview-stats">
                <h4>{t('interviewStats.errors.error')}</h4>
                <p className="_red">{t('interviewStats.errors.surveyObjectsNotAvailable')}</p>
            </div>
        );
    }

    const interview = surveyObjects.interview;
    const household: Optional<Household> = surveyObjects.household;
    const home: Optional<Home> = surveyObjects.home;

    if (!interview) {
        return (
            <div className="admin__interview-stats">
                <h4>{t('interviewStats.errors.error')}</h4>
                <p className="_red">{t('interviewStats.errors.interviewNotAvailable')}</p>
            </div>
        );
    }

    if (!household) {
        return (
            <div className="admin__interview-stats">
                <h4>{t('interviewStats.errors.error')}</h4>
                <p className="_red">{t('interviewStats.errors.householdNotAvailable')}</p>
            </div>
        );
    }

    if (!home) {
        return (
            <div className="admin__interview-stats">
                <h4>{t('interviewStats.errors.error')}</h4>
                <p className="_red">{t('interviewStats.errors.homeNotAvailable')}</p>
            </div>
        );
    }

    const persons: { [key: string]: Person } = household?.members
        ? household.members.reduce(
            (acc, person) => {
                acc[person._uuid!] = person;
                return acc;
            },
              {} as { [key: string]: Person }
        )
        : {};

    // Check if there are any audits in the interview
    const hasAudits = Boolean(
        (surveyObjects?.auditsByObject &&
            Object.keys(surveyObjects.auditsByObject).some(
                (key) => surveyObjects.auditsByObject![key] && surveyObjects.auditsByObject![key].length > 0
            )) ||
            (surveyObjects?.audits && surveyObjects.audits.length > 0)
    );

    return (
        <React.Fragment>
            {props.validationDataDirty && (
                <p className="_audit-error _strong">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="faIconLeft" />
                    {t('ValidationDataDirty')}
                </p>
            )}
            <div key="header">
                {props.toggleAuditErrorCode && hasAudits && (
                    <span className="_widget _oblique">
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                props.toggleAuditErrorCode?.();
                            }}
                        >
                            {props.prefs?.showAuditErrorCode ? t('HideAuditErrorCodes') : t('ShowAuditErrorCodes')}
                        </a>
                    </span>
                )}
            </div>
            {surveyObjects?.interview && (
                <InterviewPanel
                    interview={surveyObjects.interview}
                    audits={surveyObjects?.auditsByObject?.interview}
                    showAuditErrorCode={props.prefs?.showAuditErrorCode}
                />
            )}
            <HomePanel
                home={home}
                audits={surveyObjects?.auditsByObject?.home}
                showAuditErrorCode={props.prefs?.showAuditErrorCode}
            />
            <HouseholdPanel
                household={household}
                audits={surveyObjects?.auditsByObject?.household}
                showAuditErrorCode={props.prefs?.showAuditErrorCode}
            />
            <div className="admin__interview-stats" key="persons">
                <h4>{t('interviewStats.labels.persons')}</h4>
                {Object.keys(persons).map((personId, index) => {
                    const person: Person = persons[personId];
                    const unserializedPerson = household?.members?.find((p) => p._uuid === personId);
                    let journey: Optional<Journey>;
                    if (unserializedPerson?.journeys && unserializedPerson.journeys.length > 0) {
                        journey = unserializedPerson.journeys[0];
                    }

                    return (
                        <PersonPanel
                            key={personId}
                            person={person}
                            journey={journey}
                            personId={personId}
                            personIndex={index + 1}
                            audits={surveyObjects?.auditsByObject?.persons?.[personId]}
                            activeTripUuid={props.activeTripUuid}
                            activePlacePath={props.activePlacePath}
                            selectPlace={props.selectPlace}
                            selectTrip={props.selectTrip}
                            keepDiscard={keepDiscard}
                            showAuditErrorCode={props.prefs?.showAuditErrorCode}
                        />
                    );
                })}
            </div>
            <div className="admin__interview-stats" key="comments">
                <h4>{t('Comments')}</h4>
                <p className="_scrollable _oblique _small">
                    {interview.respondentComments || t('interviewStats.labels.noComments')}
                </p>
            </div>
            {surveyObjects?.audits && surveyObjects.audits.length > 0 && (
                <div className="admin__interview-stats" key="all-audits">
                    <details open={false}>
                        <summary>
                            <h4 style={{ display: 'inline', margin: 0 }}>{t('AllAudits')}</h4>
                        </summary>
                        <AuditDisplay
                            hideInfoAudits={false}
                            audits={surveyObjects.audits}
                            showAuditErrorCode={props.prefs?.showAuditErrorCode}
                        />
                    </details>
                </div>
            )}
        </React.Fragment>
    );
};

export default InterviewStats;
