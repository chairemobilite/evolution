/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Survey, { SurveyProps } from '../pages/Survey';
import ErrorBoundary from '../survey/ErrorBoundary';

const SurveyWithErrorBoundary = (props: SurveyProps) => (
    <ErrorBoundary>
        <Survey {...props} />
    </ErrorBoundary>
);
export default SurveyWithErrorBoundary;
