/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { SurveyContext, SurveyContextType } from '../../contexts/SurveyContext';

export interface WithSurveyContextProps {
    surveyContext: SurveyContextType;
}

export const withSurveyContext =
    <T extends WithSurveyContextProps = WithSurveyContextProps>(WrappedComponent: React.ComponentType<T>) =>
        (props: Omit<T, keyof WithSurveyContextProps>) => (
            <SurveyContext.Consumer>
                {(context) => <WrappedComponent {...(props as T)} surveyContext={context} />}
            </SurveyContext.Consumer>
        );
