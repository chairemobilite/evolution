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
    const [showInterviewList, setShowInterviewList] = useState(true);
    const [prevInterviewUuid, setPrevInterviewUuid] = useState<string | undefined>(undefined);
    const [nextInterviewUuid, setNextInterviewUuid] = useState<string | undefined>(undefined);

    const handleInterviewSummaryChange = useCallback(
        (interviewUuid: string | null, prevUuid?: string, nextUuid?: string) => {
            if (interviewUuid) {
                // If prev/next UUIDs are provided (called from list), use them directly
                if (prevUuid !== undefined || nextUuid !== undefined) {
                    setPrevInterviewUuid(prevUuid || undefined);
                    setNextInterviewUuid(nextUuid || undefined);
                } else {
                    // If no prev/next UUIDs provided (called from navigation buttons),
                    // try to extract them from the DOM as fallback
                    const listButton = document.getElementById(`interviewButtonList_${interviewUuid}`);
                    if (listButton) {
                        const domPrevUuid = listButton.getAttribute('data-prev-uuid');
                        const domNextUuid = listButton.getAttribute('data-next-uuid');
                        setPrevInterviewUuid(domPrevUuid === null || domPrevUuid === '' ? undefined : domPrevUuid);
                        setNextInterviewUuid(domNextUuid === null || domNextUuid === '' ? undefined : domNextUuid);
                    } else {
                        // If DOM element not found, clear the navigation
                        setPrevInterviewUuid(undefined);
                        setNextInterviewUuid(undefined);
                    }
                }

                dispatch(
                    startSetSurveyCorrectedInterview(interviewUuid, () => {
                        // UUIDs are already set above
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
