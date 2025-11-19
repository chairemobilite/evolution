/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWindowClose } from '@fortawesome/free-solid-svg-icons/faWindowClose';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons/faCheckDouble';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons/faSyncAlt';
import { faUndoAlt } from '@fortawesome/free-solid-svg-icons/faUndoAlt';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import { faHandPaper } from '@fortawesome/free-solid-svg-icons/faHandPaper';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons/faClipboardList';
import { faChevronCircleRight } from '@fortawesome/free-solid-svg-icons/faChevronCircleRight';
import { faChevronCircleLeft } from '@fortawesome/free-solid-svg-icons/faChevronCircleLeft';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';

import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

type ValidationLinksProps = {
    handleInterviewSummaryChange: (uuid: string | null) => void;
    updateValuesByPath: (values: any) => void;
    interviewIsValid: boolean;
    interviewIsQuestionable: boolean;
    interviewUuid: string;
    user: CliUser;
    nextInterviewUuid?: string;
    prevInterviewUuid?: string;
    refreshInterview: () => void;
    refreshInterviewWithExtended: () => void;
    resetInterview: () => void;
    interviewIsComplete: boolean;
    interviewIsValidated: boolean;
    interview: UserRuntimeInterviewAttributes;
};

const ValidationLinks: React.FunctionComponent<ValidationLinksProps> = ({
    handleInterviewSummaryChange,
    updateValuesByPath,
    interviewIsValid,
    interviewIsQuestionable,
    interviewUuid,
    user,
    nextInterviewUuid,
    prevInterviewUuid,
    refreshInterview,
    refreshInterviewWithExtended,
    resetInterview,
    interviewIsComplete,
    interviewIsValidated,
    interview
}: ValidationLinksProps) => {
    const { t } = useTranslation('admin');
    const canConfirm = user.isAuthorized({ Interviews: ['confirm'] });

    // State for confirmation modals
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);
    const [showEditFrozenConfirmation, setShowEditFrozenConfirmation] = useState(false);

    // Check if interview is frozen
    const interviewIsFrozen = interview.is_frozen === true;

    const handleResetClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowResetConfirmation(true);
    };

    // FIXME Add an option to not show this dialog again for the session when https://github.com/chairemobilite/transition/pull/1510 is merged
    const handleEditClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (interviewIsFrozen) {
            setShowEditFrozenConfirmation(true);
        } else {
            window.open(`/admin/survey/interview/${interviewUuid}`, '_blank');
        }
    };

    const handleResetConfirm = () => {
        resetInterview();
        setShowResetConfirmation(false);
    };

    const handleEditFrozenConfirm = () => {
        window.open(`/admin/survey/interview/${interviewUuid}`, '_blank');
        setShowEditFrozenConfirmation(false);
    };

    return (
        <p className="center _large">
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    handleInterviewSummaryChange(null);
                }}
                title={t('admin:closeInterviewSummary')}
            >
                <FontAwesomeIcon icon={faWindowClose} />
            </a>
            <React.Fragment>
                {' '}
                &nbsp;&nbsp;
                <a
                    href="#"
                    className={`_together ${interviewIsQuestionable ? '_red _active-background' : '_green'}`}
                    title={t(interviewIsQuestionable ? 'admin:UnsetQuestionable' : 'admin:SetQuestionable')}
                    onClick={(e) => {
                        e.preventDefault();
                        updateValuesByPath({ is_questionable: !interviewIsQuestionable });
                    }}
                >
                    <span className="_small">
                        <FontAwesomeIcon icon={faQuestionCircle} />
                        <FontAwesomeIcon icon={faHandPaper} />
                    </span>
                </a>
            </React.Fragment>
            {
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={`_red${interviewIsValid === false ? ' _active-background' : ''}`}
                        title={t('admin:SetInvalid')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_valid: false });
                        }}
                    >
                        <FontAwesomeIcon icon={faBan} />
                    </a>
                </React.Fragment>
            }
            {
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={`_green${interviewIsValid === true ? ' _active-background' : ''}`}
                        title={t('admin:SetValid')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_valid: true });
                        }}
                    >
                        <FontAwesomeIcon icon={faCheck} />
                    </a>
                </React.Fragment>
            }
            {
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={`_together _red${interviewIsComplete === false ? ' _active-background' : ''}`}
                        title={t('admin:SetIncomplete')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_completed: false });
                        }}
                    >
                        <span className="_small">
                            <FontAwesomeIcon icon={faBan} />
                        </span>
                        <FontAwesomeIcon icon={faClipboardList} />
                    </a>
                </React.Fragment>
            }
            {
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={`_together _green${interviewIsComplete === true ? ' _active-background' : ''}`}
                        title={t('admin:SetComplete')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_completed: true });
                        }}
                    >
                        <span className="_small">
                            <FontAwesomeIcon icon={faCheck} />
                        </span>
                        <FontAwesomeIcon icon={faClipboardList} />
                    </a>
                </React.Fragment>
            }
            {canConfirm && interviewIsValidated === true && (
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={'_green _active-background'}
                        title={t('admin:SetIsValidatedEmpty')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_validated: null });
                        }}
                    >
                        <FontAwesomeIcon icon={faCheckDouble} />
                    </a>
                </React.Fragment>
            )}
            {canConfirm && interviewIsValidated !== true && (
                <React.Fragment>
                    {' '}
                    &nbsp;&nbsp;
                    <a
                        href="#"
                        className={'_green'}
                        title={t('admin:SetIsValidated')}
                        onClick={(e) => {
                            e.preventDefault();
                            updateValuesByPath({ is_validated: true });
                        }}
                    >
                        <FontAwesomeIcon icon={faCheckDouble} />
                    </a>
                </React.Fragment>
            )}{' '}
            &nbsp;&nbsp;
            <a href="#" onClick={handleEditClick} title={t('admin:editValidationInterview')}>
                <FontAwesomeIcon icon={faPencilAlt} />
            </a>{' '}
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    refreshInterview();
                }}
                title={t('admin:refreshInterview')}
            >
                <FontAwesomeIcon icon={faSyncAlt} />
            </a>{' '}
            <a
                href="#"
                className="_together"
                onClick={(e) => {
                    e.preventDefault();
                    refreshInterviewWithExtended();
                }}
                title={t('admin:refreshInterviewWithExtended')}
            >
                <span className="_small">
                    <FontAwesomeIcon icon={faBolt} />
                </span>
                <FontAwesomeIcon icon={faSyncAlt} />
            </a>{' '}
            <a href="#" onClick={handleResetClick} title={t('admin:resetInterview')}>
                <FontAwesomeIcon icon={faUndoAlt} />
            </a>
            {prevInterviewUuid && (
                <React.Fragment>
                    {' '}
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleInterviewSummaryChange(prevInterviewUuid);
                        }}
                        title={t('admin:prevInterview')}
                    >
                        <FontAwesomeIcon icon={faChevronCircleLeft} />
                    </a>
                </React.Fragment>
            )}
            {nextInterviewUuid && (
                <React.Fragment>
                    {' '}
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleInterviewSummaryChange(nextInterviewUuid);
                        }}
                        title={t('admin:nextInterview')}
                    >
                        <FontAwesomeIcon icon={faChevronCircleRight} />
                    </a>
                </React.Fragment>
            )}
            {/* Confirmation modals */}
            <ConfirmModal
                isOpen={showResetConfirmation}
                closeModal={() => setShowResetConfirmation(false)}
                title={t('admin:resetInterviewConfirmTitle')}
                text={t('admin:resetInterviewConfirmMessage')}
                confirmAction={handleResetConfirm}
                confirmButtonLabel={t('admin:confirmButton')}
                cancelButtonLabel={t('admin:cancelButton')}
            />
            <ConfirmModal
                isOpen={showEditFrozenConfirmation}
                closeModal={() => setShowEditFrozenConfirmation(false)}
                title={t('admin:editReviewedInterviewConfirmTitle')}
                text={t('admin:editReviewedInterviewConfirmMessage')}
                confirmAction={handleEditFrozenConfirm}
                confirmButtonLabel={t('admin:confirmButton')}
                cancelButtonLabel={t('admin:cancelButton')}
            />
        </p>
    );
};

export default ValidationLinks;
