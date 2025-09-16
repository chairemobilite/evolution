/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons/faFolderOpen';
import { ThunkDispatch } from 'redux-thunk';

import InterviewSummary from '../validations/InterviewSummary';
import { startSetSurveyCorrectedInterview } from '../../../actions/SurveyAdmin';
import { setInterviewState } from '../../../actions/Survey';
import InterviewListComponent from '../validations/InterviewListComponent';
import { RootState } from '../../../store/configureStore';
import { SurveyAction } from '../../../store/survey';

const ReviewPage = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const interview = useSelector((state: RootState) => state.survey.interview);
    const [showInterviewList, setShowInterviewList] = useState(false);
    const [prevInterviewUuid, setPrevInterviewUuid] = useState<string | undefined>(undefined);
    const [nextInterviewUuid, setNextInterviewUuid] = useState<string | undefined>(undefined);

    const handleInterviewSummaryChange = useCallback(
        (interviewUuid: string | null) => {
            if (interviewUuid) {
                // FIXME The next/previous interviews come from the list. That
                // makes the last/first interview of the _list_ the last/first
                // total, but there could be pages. It should be handled
                // differently.
                const listButton = document.getElementById(`interviewButtonList_${interviewUuid}`);
                if (!listButton) {
                    // The filter probably changed, reset to null
                    setPrevInterviewUuid(undefined);
                    setNextInterviewUuid(undefined);
                    return;
                }
                const prevUuid = listButton.getAttribute('data-prev-uuid');
                const nextUuid = listButton.getAttribute('data-next-uuid');

                dispatch(
                    startSetSurveyCorrectedInterview(interviewUuid, () => {
                        setPrevInterviewUuid(prevUuid === null ? undefined : prevUuid);
                        setNextInterviewUuid(nextUuid === null ? undefined : nextUuid);
                    })
                );
            } else {
                // Close button clicked - clear the interview and show the list
                setShowInterviewList(true);
                setPrevInterviewUuid(undefined);
                setNextInterviewUuid(undefined);
                // Clear the current interview from Redux state
                dispatch(setInterviewState(undefined));
            }
        },
        [dispatch]
    );

    const handleInterviewListChange = useCallback((show: boolean) => {
        setShowInterviewList(show);
    }, []);

    return (
        <div className="survey">
            <div className="admin">
                <div style={{ flexDirection: 'row', flex: '1 1 auto' }}>
                    {interview && !showInterviewList && (
                        <div style={{ float: 'right', position: 'relative', left: '-3rem' }}>
                            <button
                                title={t('admin:ShowInterviewList')}
                                onClick={() => handleInterviewListChange(true)}
                            >
                                <FontAwesomeIcon icon={faFolderOpen} />{' '}
                            </button>
                        </div>
                    )}
                    {interview && (
                        <InterviewSummary
                            key={interview.uuid}
                            handleInterviewSummaryChange={handleInterviewSummaryChange}
                            prevInterviewUuid={prevInterviewUuid}
                            nextInterviewUuid={nextInterviewUuid}
                        />
                    )}
                </div>
                <InterviewListComponent
                    onInterviewSummaryChanged={handleInterviewSummaryChange}
                    initialSortBy={[{ id: 'response.accessCode' }]}
                    interviewListChange={handleInterviewListChange}
                    showInterviewList={showInterviewList}
                    validationInterview={interview}
                />
            </div>
        </div>
    );
};

export default ReviewPage;
