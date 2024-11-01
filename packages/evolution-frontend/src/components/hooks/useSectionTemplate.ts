/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { useEffect, useState } from 'react';
import { createBrowserHistory } from 'history';
import { getPathForSection } from '../../services/url'; // Adjust the import path
import _get from 'lodash/get';
import { SectionConfig, UserFrontendInterviewAttributes } from '../../services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { InterviewUpdateCallbacks } from 'evolution-common/lib/utils/helpers';

export type SectionProps = {
    shortname: string;
    sectionConfig: SectionConfig;
    interview: UserFrontendInterviewAttributes;
    errors: { [path: string]: string };
    user: CliUser;
    allWidgetsValid?: boolean;
    submitted?: boolean;
    loadingState: number;
} & InterviewUpdateCallbacks;

export function useSectionTemplate(props: SectionProps) {
    const [preloaded, setPreloaded] = useState(false);

    // Call preload upon the first mount of the component
    useEffect(() => {
        if (typeof props.sectionConfig.preload === 'function') {
            props.sectionConfig.preload.call(
                null,
                props.interview,
                props.startUpdateInterview,
                props.startAddGroupedObjects,
                props.startRemoveGroupedObjects,
                () => setPreloaded(true),
                props.user
            );
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

    // FIXME Does this have an effect. Are we just recreating a browser history every time? That was in the original section code
    const history = createBrowserHistory();

    const path = getPathForSection(history.location.pathname, props.shortname);
    if (path) {
        history.push(path);
    }

    return { preloaded };
}
