/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useState, useEffect } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import ConfirmModal from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import { ButtonWidgetConfig, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { InterviewUpdateCallbacks } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

type ButtonProps = InterviewUpdateCallbacks & {
    widgetConfig: ButtonWidgetConfig;
    widgetStatus: WidgetStatus;
    loadingState: number;
    interview: UserRuntimeInterviewAttributes;
    user?: CliUser;
    path: string;
    label?: string;
    section: string;
};

const Button: React.FC<ButtonProps & WithSurveyContextProps & WithTranslation> = (
    props: ButtonProps & WithSurveyContextProps & WithTranslation
) => {
    const [wasMouseDowned, setWasMouseDowned] = useState(false);
    const [loadingState, setLoadingState] = useState(props.loadingState);
    const [modalIsOpened, setModalIsOpened] = useState(false);

    useEffect(() => {
        // wait for any field to blur (unfocus) and save and/or validate, then trigger click:
        if (props.widgetConfig.hideWhenRefreshing) {
            if (props.loadingState === 0 && loadingState > 0 && wasMouseDowned === true) {
                // this is a hack because it will ignore mouseup if triggered and
                // will run clickButton even if the mouse was not upped.
                // but there is no other way to wait for blur to complete with fast clicks
                // (fast clicks with onBlur do not trigger mouseup)
                setWasMouseDowned(false);
                onClickButton();
            }
        }
        setLoadingState(props.loadingState);
    }, [props.loadingState]);

    const onMouseDown = () => {
        setWasMouseDowned(true);
    };

    const onMouseUp = () => {
        if (!props.widgetConfig.hideWhenRefreshing) {
            onClickButton();
        } else {
            setWasMouseDowned(false);
            onClickButton();
        }
    };

    const confirmButton = () => {
        props.widgetConfig.action(
            {
                startUpdateInterview: props.startUpdateInterview,
                startAddGroupedObjects: props.startAddGroupedObjects,
                startRemoveGroupedObjects: props.startRemoveGroupedObjects
            },
            props.interview,
            props.path,
            props.section,
            props.surveyContext.sections,
            props.widgetConfig.saveCallback
        );
    };

    const onClickButton = () => {
        const hasConfirmPopup = props.widgetConfig.confirmPopup !== undefined;
        const confirmPopupConditional = hasConfirmPopup
            ? surveyHelper.parseBoolean(
                  props.widgetConfig.confirmPopup!.conditional,
                  props.interview,
                  props.path,
                  props.user
            )
            : true;

        if (hasConfirmPopup && confirmPopupConditional === true) {
            setModalIsOpened(true);
        } else {
            confirmButton();
        }
    };

    const isLoading = props.widgetConfig.hideWhenRefreshing && props.loadingState > 0;
    const buttonColor = props.widgetConfig.color || 'green';

    if (!props.widgetStatus.isVisible) {
        return null;
    }

    return (
        <div className={props.widgetConfig.align || 'center'}>
            <button
                type="button"
                className={`survey-section__button button ${buttonColor} ${props.widgetConfig.size || 'large'} ${
                    isLoading ? 'disabled' : ''
                }`}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onKeyUp={(e) => {
                    if (e.key === 'enter' || e.key === 'space' || e.keyCode === 13 || e.keyCode === 32) {
                        onClickButton();
                    } else {
                        return;
                    }
                }}
                disabled={isLoading}
            >
                {props.widgetConfig.icon && <FontAwesomeIcon icon={props.widgetConfig.icon} className="faIconLeft" />}
                {surveyHelper.translateString(
                    props.label || props.widgetConfig.label,
                    props.i18n,
                    props.interview,
                    props.path
                )}
            </button>
            {/* confirmPopup below: */}
            {modalIsOpened && props.widgetConfig.confirmPopup && (
                <div>
                    <ConfirmModal
                        isOpen={true}
                        closeModal={() => setModalIsOpened(false)}
                        text={surveyHelper.translateString(
                            props.widgetConfig.confirmPopup.content,
                            props.i18n,
                            props.interview,
                            props.path
                        )}
                        title={
                            surveyHelper.translateString(
                                props.widgetConfig.confirmPopup.title,
                                props.i18n,
                                props.interview,
                                props.path
                            ) || ''
                        }
                        cancelAction={props.widgetConfig.confirmPopup.cancelAction}
                        showCancelButton={props.widgetConfig.confirmPopup.showCancelButton !== false}
                        showConfirmButton={props.widgetConfig.confirmPopup.showConfirmButton !== false}
                        cancelButtonLabel={surveyHelper.translateString(
                            props.widgetConfig.confirmPopup.cancelButtonLabel,
                            props.i18n,
                            props.interview,
                            props.path
                        )}
                        confirmButtonLabel={surveyHelper.translateString(
                            props.widgetConfig.confirmPopup.confirmButtonLabel,
                            props.i18n,
                            props.interview,
                            props.path
                        )}
                        cancelButtonColor={props.widgetConfig.confirmPopup.cancelButtonColor}
                        confirmButtonColor={props.widgetConfig.confirmPopup.confirmButtonColor}
                        containsHtml={props.widgetConfig.containsHtml || false}
                        confirmAction={confirmButton}
                    />
                </div>
            )}
        </div>
    );
};

export default withTranslation()(withSurveyContext(Button));
