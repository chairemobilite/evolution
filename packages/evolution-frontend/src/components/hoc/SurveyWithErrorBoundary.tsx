/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Survey from '../pages/Survey';
import ErrorBoundary from '../survey/ErrorBoundary';

// FIXME Type the props
const SurveyWithErrorBoundary = (props) => (
    <ErrorBoundary>
        <Survey {...props} />
    </ErrorBoundary>
);
export default SurveyWithErrorBoundary;
