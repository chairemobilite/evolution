/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

import isEqual from 'lodash/isEqual';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import InputLoading from '../inputs/InputLoading';
import InputString from '../inputs/InputString';
import InputMapPoint from '../inputs/InputMapPoint';
import InputMapFindPlace from '../inputs/InputMapFindPlace';
// TODO Support find place with photon
// import InputMapFindPlacePhotonOsm from './input/InputMapFindPlacePhotonOsm';
import InputDatePicker from '../inputs/InputDatePicker';
import InputRadio from '../inputs/InputRadio';
import InputCheckbox from '../inputs/InputCheckbox';
import InputRange from '../inputs/InputRange';
import InputButton from '../inputs/InputButton';
import InputSelect from '../inputs/InputSelect';
import InputMultiselect from '../inputs/InputMultiselect';
import InputTime from '../inputs/InputTime';
import InputRadioNumber from '../inputs/InputRadioNumber';
import InputText from '../inputs/InputText';
import Modal from 'react-modal';
import { checkValidations } from '../../actions/utils';
import { withSurveyContext, WithSurveyContextProps } from '../hoc/WithSurveyContextHoc';
import {
    isWidgetModal,
    StartUpdateInterview,
    UserAction,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { QuestionWidgetConfig, isInputTypeWithArrayValue } from 'evolution-common/lib/services/questionnaire/types';
import { WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import InputWidgetWrapper from './widgets/InputWidgetWrapper';

interface QuestionProps {
    path: string;
    customPath?: string;
    section: string;
    loadingState: number;
    widgetConfig: QuestionWidgetConfig;
    join?: boolean;
    interview: UserInterviewAttributes;
    user: CliUser;
    widgetStatus: WidgetStatus;
    startUpdateInterview: StartUpdateInterview;
}

type QuestionState = {
    modalIsOpen: boolean;
};

export class Question extends React.Component<QuestionProps & WithSurveyContextProps & WithTranslation, QuestionState> {
    private inputRef: React.RefObject<HTMLInputElement | null> = React.createRef();

    constructor(props: QuestionProps & WithSurveyContextProps & WithTranslation) {
        super(props);

        this.state = {
            modalIsOpen: isWidgetModal(props.widgetConfig) && props.widgetStatus.isVisible === true
        };
    }

    private closeModal = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
        }
        this.setState({ modalIsOpen: false });
    };

    //afterOpenHelperModal() {
    //  // references are now sync'd and can be accessed.
    //}

    private onValueChange = (e: any, customValue?: string) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
            //e.persist(); // for debounce
        }

        const widgetStatus = this.props.widgetStatus;
        const widgetConfig = this.props.widgetConfig;
        const previousValue = widgetStatus.value;
        const previousCustomValue = widgetStatus.customValue;
        const value = e.target ? e.target.value : e; //InputDatePicker call onValueChange with e=value
        const parsedValue = surveyHelper.parseValue(
            value,
            (widgetConfig as any).datatype,
            isInputTypeWithArrayValue(widgetConfig.inputType)
        );
        const parsedCustomValue = surveyHelper.parseValue(customValue, (widgetConfig as any).customDatatype);
        const [isValid] = checkValidations(
            widgetConfig.validations,
            parsedValue,
            parsedCustomValue,
            this.props.interview,
            this.props.path,
            this.props.customPath
        );

        const valuesByPath = {};
        let userAction: UserAction | undefined = undefined;

        if (!isEqual(parsedValue, previousValue) && !(parsedValue === null && previousValue === undefined)) {
            valuesByPath['validations.' + this.props.path] = isValid;
            userAction = {
                type: 'widgetInteraction',
                widgetType: widgetConfig.inputType,
                path: 'response.' + this.props.path,
                value: parsedValue
            };
        }

        if (
            this.props.customPath &&
            !isEqual(parsedCustomValue, previousCustomValue) &&
            !(parsedCustomValue === null && previousCustomValue === undefined)
        ) {
            valuesByPath['validations.' + this.props.customPath] = isValid;
            if (userAction === undefined) {
                userAction = {
                    type: 'widgetInteraction',
                    widgetType: 'string',
                    path: 'response.' + this.props.customPath,
                    value: parsedCustomValue
                };
            } else {
                console.warn(
                    'userAction already defined, but a custom value has been specified. It is thus possible to update more than one value for a single user action.'
                );
                valuesByPath['response.' + this.props.customPath] = parsedCustomValue;
            }
        }

        if (userAction !== undefined || this.props.widgetConfig.inputType === 'button') {
            // force update with buttons
            let saveCallback = undefined;
            if (isValid && typeof (widgetConfig as any).saveCallback === 'function') {
                saveCallback = (widgetConfig as any).saveCallback;
            }
            this.props.startUpdateInterview({ valuesByPath, userAction }, saveCallback);
        }

        if (isWidgetModal(widgetConfig) && this.state.modalIsOpen && isValid) {
            this.closeModal();
        }
    };

    shouldComponentUpdate(nextProps, _nextState) {
        // we need to re-render whenever loading state changes for widgets with buttons, like mapFindPlace:
        // TODO: find all buttons inside questions to make sure they are correctly re-render before click event is triggered.
        // See Button.js for more comments about this issue
        return nextProps.widgetConfig.inputType === 'mapFindPlace' || nextProps.loadingState === 0;
    }

    render() {
        const widgetStatus = this.props.widgetStatus;

        if (!widgetStatus.isVisible && !this.props.surveyContext.devMode) {
            return null;
        }
        // We're here, if the widget is not visible, we're in devMode, so disable it
        const disabled = !widgetStatus.isVisible;

        surveyHelper.devLog(
            '%c rendering question ' + this.props.path,
            'background: rgba(255,255,0,0.1); font-size: 7px;'
        );

        const id = `survey-question__${this.props.path}`;

        const widgetConfig = this.props.widgetConfig;
        const inputType = this.props.widgetConfig.inputType;
        const label =
            surveyHelper.translateString(
                widgetConfig.label,
                this.props.i18n,
                this.props.interview,
                this.props.path,
                this.props.user
            ) || '';
        const twoColumns =
            typeof widgetConfig.twoColumns === 'function'
                ? (widgetConfig as any).twoColumns(this.props.interview, this.props.path)
                : widgetConfig.twoColumns;
        const showErrorMessage =
            widgetStatus.isResponded === true &&
            widgetStatus.isValid === false &&
            !disabled &&
            widgetStatus.errorMessage
                ? true
                : false;
        const widgetContent = () => {
            if (!(this.props.interview && this.props.interview.response)) {
                return <InputLoading />;
            }

            const commonProps = {
                interview: this.props.interview,
                path: this.props.path,
                user: this.props.user,
                id,
                onValueChange: this.onValueChange,
                // TODO Have the right inputRef type
                inputRef: this.inputRef as any
            };
            switch (widgetConfig.inputType) {
            case 'string':
                return (
                    <InputString
                        {...commonProps}
                        widgetConfig={widgetConfig}
                        updateKey={widgetStatus.currentUpdateKey}
                        value={widgetStatus.value as any}
                    />
                );
            case 'mapPoint':
                return (
                    <InputMapPoint
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'mapFindPlace':
                return (
                    <InputMapFindPlace
                        {...commonProps}
                        value={widgetStatus.value as any}
                        loadingState={this.props.loadingState}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'radio':
                return (
                    <InputRadio
                        {...commonProps}
                        customValue={widgetStatus.customValue as any}
                        value={widgetStatus.value as any}
                        customPath={this.props.customPath}
                        customId={this.props.customPath ? `survey-question__${this.props.customPath}` : undefined}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'radioNumber':
                return (
                    <InputRadioNumber
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'checkbox':
                return (
                    <InputCheckbox
                        {...commonProps}
                        customValue={widgetStatus.customValue as any}
                        value={widgetStatus.value as any}
                        customId={this.props.customPath ? `survey-question__${this.props.customPath}` : undefined}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'button':
                return (
                    <InputButton
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'select':
                return (
                    <InputSelect
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'multiselect':
                return (
                    <InputMultiselect
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'time':
                return (
                    <InputTime
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'text':
                return <InputText {...commonProps} value={widgetStatus.value as any} widgetConfig={widgetConfig} />;
            case 'datePicker':
                return (
                    <InputDatePicker
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            case 'slider':
                return (
                    <InputRange
                        {...commonProps}
                        value={widgetStatus.value as any}
                        widgetConfig={widgetConfig as any}
                    />
                );
            default:
                return (
                    <InputString
                        {...commonProps}
                        {...commonProps}
                        widgetConfig={widgetConfig}
                        updateKey={widgetStatus.currentUpdateKey}
                        value={widgetStatus.value as any}
                    />
                );
            }
        };
        const content = (
            <div
                key={'content_' + this.props.path}
                style={{ position: 'relative' }}
                className={`apptr__form-container${this.props.join ? ' apptr__form-join-next' : ''}${
                    twoColumns ? ' two-columns' : ''
                }${widgetStatus.isDisabled || disabled ? ' disabled' : ''} question-type-${inputType}${
                    widgetStatus.isEmpty ? ' question-empty' : ' question-filled'
                }${
                    !widgetStatus.isEmpty && widgetStatus.isValid === true
                        ? ' question-valid'
                        : showErrorMessage === true
                            ? ' question-invalid'
                            : ''
                }`}
                onClick={() => {
                    if (this.inputRef.current && typeof this.inputRef.current.focus === 'function') {
                        this.inputRef.current.focus();
                    }
                }}
            >
                <InputWidgetWrapper
                    label={label}
                    errorMessage={
                        showErrorMessage === true
                            ? surveyHelper.translateString(
                                widgetStatus.errorMessage,
                                this.props.i18n,
                                this.props.interview,
                                this.props.path
                            ) || ''
                            : undefined
                    }
                    helpTitle={
                        widgetConfig.helpPopup && widgetConfig.helpPopup.title
                            ? surveyHelper.translateString(
                                widgetConfig.helpPopup.title,
                                this.props.i18n,
                                this.props.interview,
                                this.props.path
                            ) || ''
                            : undefined
                    }
                    helpContent={
                        widgetConfig.helpPopup && widgetConfig.helpPopup.content
                            ? () =>
                                surveyHelper.translateString(
                                    widgetConfig.helpPopup?.content,
                                    this.props.i18n,
                                    this.props.interview,
                                    this.props.path
                                ) || ''
                            : undefined
                    }
                    widgetConfig={widgetConfig as any}
                    isCollapsed={widgetStatus.isCollapsed}
                    className={`apptr__form-label-container${twoColumns ? ' two-columns' : ''}${
                        (widgetConfig as any).align === 'center' ? ' align-center' : ''
                    }`}
                    widgetId={id}
                >
                    {(!widgetStatus.isDisabled ||
                        (widgetStatus.isDisabled && !(widgetConfig as any).canBeCollapsed)) && (
                        <div className={`apptr__form-input-container ${twoColumns ? 'two-columns' : ''}`}>
                            {widgetContent()}
                        </div>
                    )}
                </InputWidgetWrapper>
            </div>
        );

        if (isWidgetModal(widgetConfig)) {
            if (!this.state.modalIsOpen) {
                return null;
            }
            if (!process.env.IS_TESTING) {
                Modal.setAppElement('#app');
            }
            return (
                <Modal
                    isOpen={true}
                    onRequestClose={() => this.closeModal()}
                    className="react-modal"
                    overlayClassName="react-modal-overlay"
                    contentLabel={(widgetConfig as any).title || ''}
                >
                    {content}
                </Modal>
            );
        } else {
            return content;
        }
    }
}

export default withTranslation()(withSurveyContext(Question));
