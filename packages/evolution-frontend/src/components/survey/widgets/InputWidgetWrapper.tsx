/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Markdown from 'react-markdown';

import { QuestionWidgetConfig } from 'evolution-common/lib/services/widgets';
import SurveyErrorMessage from './SurveyErrorMessage';
import HelpPopupLink from './HelpPopupLink';

interface InputWidgetWrapperProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    /** Text shown on the link and title of the modal */
    label: string;
    errorMessage?: string;
    helpTitle?: string;
    helpContent?: () => string;
    widgetConfig: QuestionWidgetConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // FIXME This comes from the widget status, but the Question widget did not originally set the collapsed status. Where does it come from? This widget only displays toggled or not
    isCollapsed: boolean;
    className: string;
    widgetId: string;
}

const FieldsetWrapper = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: React.PropsWithChildren<InputWidgetWrapperProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
) => {
    const [isCollapsed, setIsCollapsed] = React.useState(props.isCollapsed);
    return (
        <fieldset>
            <div className={props.className}>
                <legend>
                    <div
                        className="apptr__form__label-standalone"
                        onClick={
                            (props.widgetConfig as any).canBeCollapsed === true
                                ? () => setIsCollapsed(!isCollapsed)
                                : undefined
                        }
                    >
                        {props.widgetConfig.containsHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: props.label }} />
                        ) : (
                            <Markdown className="label">{props.label}</Markdown>
                        )}
                    </div>
                    {props.errorMessage !== undefined && (
                        <SurveyErrorMessage
                            containsHtml={props.widgetConfig.containsHtml === true}
                            text={props.errorMessage}
                        />
                    )}
                    {/* helpPopup below: */}
                    {props.helpTitle && typeof props.helpContent === 'function' && (
                        <HelpPopupLink
                            containsHtml={props.widgetConfig.helpPopup?.containsHtml === true}
                            title={props.helpTitle}
                            content={props.helpContent}
                        />
                    )}
                </legend>
            </div>
            {!isCollapsed && props.children}
        </fieldset>
    );
};

export const LabelOrDiv = (
    props: React.PropsWithChildren<{ needsLabel: boolean; widgetId: string; onClick?: () => void }>
) =>
    props.needsLabel ? (
        <label htmlFor={props.widgetId} onClick={props.onClick}>
            {props.children}
        </label>
    ) : (
        <div className="apptr__form__label-standalone" id={`${props.widgetId}_label`} onClick={props.onClick}>
            {props.children}
        </div>
    );

export const LabelOrDivWrapper = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: React.PropsWithChildren<InputWidgetWrapperProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>> & {
        needsLabel: boolean;
    }
) => {
    const [isCollapsed, setIsCollapsed] = React.useState(props.isCollapsed);
    return (
        <React.Fragment>
            <div className={props.className}>
                <LabelOrDiv
                    widgetId={props.widgetId}
                    needsLabel={props.needsLabel}
                    onClick={
                        (props.widgetConfig as any).canBeCollapsed === true
                            ? () => setIsCollapsed(!isCollapsed)
                            : undefined
                    }
                >
                    {props.widgetConfig.containsHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: props.label }} />
                    ) : (
                        <Markdown className="label">{props.label}</Markdown>
                    )}
                </LabelOrDiv>
                {props.errorMessage !== undefined && (
                    <SurveyErrorMessage
                        containsHtml={props.widgetConfig.containsHtml === true}
                        text={props.errorMessage}
                    />
                )}
                {/* helpPopup below: */}
                {props.helpTitle && typeof props.helpContent === 'function' && (
                    <HelpPopupLink
                        containsHtml={props.widgetConfig.helpPopup?.containsHtml === true}
                        title={props.helpTitle}
                        content={props.helpContent}
                    />
                )}
            </div>
            {!isCollapsed && props.children}
        </React.Fragment>
    );
};

export const InputWidgetWrapper = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: React.PropsWithChildren<InputWidgetWrapperProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
) => {
    const typeOfWrapping = React.useMemo(
        () =>
            props.widgetConfig.inputType === 'radio' || props.widgetConfig.inputType === 'checkbox'
                ? 'fieldset'
                : props.widgetConfig.inputType === 'slider' || props.widgetConfig.inputType === 'multiselect'
                    ? 'noLabel'
                    : 'label',
        []
    );
    return typeOfWrapping === 'fieldset' ? (
        <FieldsetWrapper {...props} />
    ) : (
        <LabelOrDivWrapper {...props} needsLabel={typeOfWrapping === 'label'} />
    );
};

export default InputWidgetWrapper;
