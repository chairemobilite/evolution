/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
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

export default function({handleInterviewSummaryChange, updateValuesByPath, interviewIsValid, interviewIsQuestionable, interviewUuid, user, nextInterviewUuid, prevInterviewUuid, refreshInterview, resetInterview, interviewIsComplete, interviewIsValidated, t}) {
  const canConfirm = user.isAuthorized({ 'Interviews': ['confirm'] });
  return (
    <p className="center _large">
      <a href="#" onClick={(e) => { e.preventDefault(); handleInterviewSummaryChange(null); }} title={t('admin:closeInterviewSummary')}><FontAwesomeIcon icon={faWindowClose} /></a>
      {/* interviewIsValid === true  && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className="_red"      title={t('admin:SetInvalid')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_valid: false}); }}><FontAwesomeIcon icon={faBan} /></a></React.Fragment> */}
      {/* interviewIsValid === false && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className="_green"    title={t('admin:SetValid')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_valid: true }); }}><FontAwesomeIcon icon={faCheck} /></a></React.Fragment> */}
      

      {/* style={{ whiteSpace: "nowrap" }} */}
      <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_together ${interviewIsQuestionable ? '_red _active-background' : '_green'}`} title={t(interviewIsQuestionable ? 'admin:UnsetQuestionable' : 'admin:SetQuestionable')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_questionable: !interviewIsQuestionable}); }}><span className="_small"><FontAwesomeIcon icon={faQuestionCircle} /><FontAwesomeIcon icon={faHandPaper} /></span></a></React.Fragment>

      {/* 
      <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" title={t('admin:SetQuestionable')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_questionable: !interviewIsQuestionable}); }}><FontAwesomeIcon icon={faQuestionCircle} /></a></React.Fragment>
      */}

      { <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_red${interviewIsValid === false ? ' _active-background' : ''}`} title={t('admin:SetInvalid')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_valid: false}); }}><FontAwesomeIcon icon={faBan} /></a></React.Fragment> }
      { <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_green${interviewIsValid === true ? ' _active-background' : ''}`} title={t('admin:SetValid')}   onClick={(e) => { e.preventDefault(); updateValuesByPath({is_valid: true}); }}><FontAwesomeIcon icon={faCheck} /></a></React.Fragment> }
      {/* interviewIsComplete === true  && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className="_red"   title={t('admin:SetIncomplete')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_completed: false}); }}><span className="_small"><FontAwesomeIcon icon={faBan} /></span><FontAwesomeIcon icon={faClipboardList} /></a></React.Fragment> */}
      {/* interviewIsComplete === false && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className="_green" title={t('admin:SetComplete')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_completed: true }); }}><span className="_small"><FontAwesomeIcon icon={faCheck} /></span><FontAwesomeIcon icon={faClipboardList} /></a></React.Fragment> */}
      { <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_together _red${interviewIsComplete === false ? ' _active-background' : ''}`}  title={t('admin:SetIncomplete')} onClick={(e) => { e.preventDefault(); updateValuesByPath({is_completed: false}); }}><span className="_small"><FontAwesomeIcon icon={faBan} /></span><FontAwesomeIcon icon={faClipboardList} /></a></React.Fragment> }
      { <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_together _green${interviewIsComplete === true ? ' _active-background' : ''}`} title={t('admin:SetComplete')}   onClick={(e) => { e.preventDefault(); updateValuesByPath({is_completed: true}); }}><span className="_small"><FontAwesomeIcon icon={faCheck} /></span><FontAwesomeIcon icon={faClipboardList} /></a></React.Fragment> }
      { canConfirm && interviewIsValidated === true && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_green _active-background`} title={t('admin:SetIsValidatedEmpty')}   onClick={(e) => { e.preventDefault(); updateValuesByPath({is_validated: null}); }}><FontAwesomeIcon icon={faCheckDouble} /></a></React.Fragment> }
      { canConfirm && interviewIsValidated !== true && <React.Fragment>{" "}&nbsp;&nbsp;<a href="#" className={`_green`}                    title={t('admin:SetIsValidated')}        onClick={(e) => { e.preventDefault(); updateValuesByPath({is_validated: true}); }}><FontAwesomeIcon icon={faCheckDouble} /></a></React.Fragment> }
      {" "} &nbsp;&nbsp;<a href={`/admin/survey/interview/${interviewUuid}`} rel="noreferrer" target="_blank" title={t('admin:editValidationInterview')}><FontAwesomeIcon icon={faPencilAlt} /></a>
      {" "} <a href="#" onClick={(e) => { e.preventDefault(); refreshInterview(); } } title={t('admin:refreshInterview')}><FontAwesomeIcon icon={faSyncAlt} /></a>
      {" "} <a href="#" onClick={(e) => { e.preventDefault(); resetInterview(); }} title={t('admin:resetInterview')}><FontAwesomeIcon icon={faUndoAlt} /></a>
      { prevInterviewUuid && <React.Fragment>{" "} <a href="#" onClick={(e) => { e.preventDefault(); handleInterviewSummaryChange(prevInterviewUuid); }} title={t('admin:prevInterview')}><FontAwesomeIcon icon={faChevronCircleLeft} /></a></React.Fragment> }
      { nextInterviewUuid && <React.Fragment>{" "} <a href="#" onClick={(e) => { e.preventDefault(); handleInterviewSummaryChange(nextInterviewUuid); }} title={t('admin:nextInterview')}><FontAwesomeIcon icon={faChevronCircleRight} /></a></React.Fragment> }
    </p>
  );
}