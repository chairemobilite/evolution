/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { useEffect, useState } from 'react';
import { getPathForSection } from '../../services/url'; // Adjust the import path
import _get from 'lodash/get';
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
            const invalidInputs = document.querySelectorAll('.question-invalid input') as NodeListOf<HTMLInputElement>;
            // Not all widgets types focus correclty on all browsers, so we do the
            // actual focus only on text widgets. For the others, we scroll to the
            // position of the first invalid question to make sure it is in view. This
            // works for all widgets types.
            if (invalidInputs.length > 0 && invalidInputs[0].id && invalidInputs[0].type === 'text') {
                // Focus on invalid input if found, it has an ID, and is of type text
                const inputElement = document.getElementById(invalidInputs[0].id);
                if (inputElement) {
                    inputElement.focus();
                }
            } else {
                // Otherwise scroll to the position of the first invalid question
                const scrollPosition = _get(document.getElementsByClassName('question-invalid'), '[0].offsetTop', null);
                if (scrollPosition && scrollPosition >= 0) {
                    window.scrollTo(0, scrollPosition);
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
