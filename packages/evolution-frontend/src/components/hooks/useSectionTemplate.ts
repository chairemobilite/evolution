/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { useEffect, useState } from 'react';
import { getPathForSection } from '../../services/url'; // Adjust the import path
import { SectionConfig, UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { InterviewUpdateCallbacks } from 'evolution-common/lib/services/questionnaire/types';
import { useLocation } from 'react-router';

export type SectionProps = {
    shortname: string;
    sectionConfig: SectionConfig;
    interview: UserRuntimeInterviewAttributes;
    errors: { [path: string]: string };
    user: CliUser;
    allWidgetsValid?: boolean;
    submitted?: boolean;
    loadingState: number;
} & InterviewUpdateCallbacks;

export function useSectionTemplate(props: SectionProps) {
    const location = useLocation();
    const [preloaded, setPreloaded] = useState(false);

    // Call preload upon the first mount of the component
    useEffect(() => {
        if (typeof props.sectionConfig.preload === 'function') {
            props.sectionConfig.preload(props.interview, {
                startUpdateInterview: props.startUpdateInterview,
                startAddGroupedObjects: props.startAddGroupedObjects,
                startRemoveGroupedObjects: props.startRemoveGroupedObjects,
                startNavigate: props.startNavigate,
                callback: () => setPreloaded(true),
                user: props.user
            });
        } else {
            setPreloaded(true);
        }
    }, []);

    // Scroll to first invalid component, if any
    useEffect(() => {
        if (!props.allWidgetsValid && props.submitted && props.loadingState === 0) {
            // Scroll to the position of the first invalid question in all
            // cases. Some browsers, like Safari iOS have security features
            // preventing focus without explicit user interaction (and this is
            // not considered one)
            const firstInvalidElement = document.getElementsByClassName('question-invalid')[0];
            if (firstInvalidElement) {
                firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Not all widgets types focus correclty on all browsers, so we do the
            // actual focus only on text widgets.
            const invalidInputs = document.querySelectorAll('.question-invalid input') as NodeListOf<HTMLInputElement>;
            if (invalidInputs.length > 0 && invalidInputs[0].id && invalidInputs[0].type === 'text') {
                // Focus on invalid input if found, it has an ID, and is of type text
                const inputElement = document.getElementById(invalidInputs[0].id);
                if (inputElement) {
                    inputElement.focus();
                }
            }
        }
    }, [props.allWidgetsValid, props.submitted, props.loadingState]);

    // Update the URL to match the section
    const path = getPathForSection(location.pathname, props.shortname);
    if (path && location.pathname !== path) {
        window.history.replaceState(null, '', path);
    }

    return { preloaded };
}
