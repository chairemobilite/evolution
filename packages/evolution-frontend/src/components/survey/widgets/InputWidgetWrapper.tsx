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

export const LabelWrapper = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: React.PropsWithChildren<InputWidgetWrapperProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
) => {
    const [isCollapsed, setIsCollapsed] = React.useState(props.isCollapsed);
    return (
        <React.Fragment>
            <div className={props.className}>
                <label
                    htmlFor={props.widgetId}
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
                </label>
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
    const shouldUseFieldset = React.useMemo(
        () => props.widgetConfig.inputType === 'radio' || props.widgetConfig.inputType === 'checkbox',
        []
    );
    return shouldUseFieldset ? <FieldsetWrapper {...props} /> : <LabelWrapper {...props} />;
};

export default InputWidgetWrapper;
