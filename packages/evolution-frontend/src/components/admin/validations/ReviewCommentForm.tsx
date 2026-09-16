/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputText from 'chaire-lib-frontend/lib/components/input/InputText';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { useDispatch } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../../store/survey';
import { RootState } from '../../../store/configureStore';
import { startUpdateSurveyCorrectedInterview } from '../../../actions/SurveyAdmin';

interface ReviewCommentFormProps {
    interview: UserInterviewAttributes;
}

const ReviewCommentForm = ({ interview }: ReviewCommentFormProps) => {
    const { t } = useTranslation(['admin', 'main']);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const savedReviewComment = interview.response._validationComment ?? '';
    const [reviewComment, setReviewComment] = useState(savedReviewComment);

    useEffect(() => {
        setReviewComment(interview.response._validationComment ?? '');
    }, [interview.uuid]);

    const isReviewCommentUnsaved = reviewComment !== savedReviewComment;

    const saveReviewComment = () => {
        if (!isReviewCommentUnsaved) {
            return;
        }
        dispatch(
            startUpdateSurveyCorrectedInterview({
                valuesByPath: {
                    'response._validationComment': reviewComment
                }
            })
        );
    };

    return (
        <React.Fragment>
            <label htmlFor={'reviewComment'}>{t('admin:reviewComment')}</label>
            <br />
            <div className="admin__review-comment-form">
                <InputText
                    id={'reviewComment'}
                    rows={8}
                    value={reviewComment}
                    onValueChange={(event) => {
                        if (event?.stopPropagation) {
                            event.stopPropagation();
                        }
                        setReviewComment(event.target.value);
                    }}
                />
                {isReviewCommentUnsaved && (
                    <button
                        type="button"
                        className="survey-section__button button blue small"
                        onClick={saveReviewComment}
                    >
                        {t('main:Save')}
                    </button>
                )}
            </div>
        </React.Fragment>
    );
};

export default ReviewCommentForm;
