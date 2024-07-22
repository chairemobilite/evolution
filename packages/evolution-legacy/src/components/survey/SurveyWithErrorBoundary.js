/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Survey from './Survey';
import ErrorBoundary from 'evolution-frontend/lib/components/survey/ErrorBoundary'

const SurveyWithErrorBoundary = (props) => <ErrorBoundary><Survey {...props}/></ErrorBoundary>;
export default SurveyWithErrorBoundary