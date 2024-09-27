/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import SurveyErrorPage from '../pages/SurveyErrorPage';
import { connect } from 'react-redux';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { reportClientSideException } from '../../services/errorManagement/errorHandling';

interface ErrorProps {
    // No props required
    interview?: UserInterviewAttributes;
}

interface ErrorState {
    hasError: boolean;
}

/**
 * Error boundary component to catch exceptions in react components and display
 * a fallback UI.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren<ErrorProps>, ErrorState> {
    constructor(props: React.PropsWithChildren<ErrorProps>) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // Display fallback UI
        this.setState({ hasError: true });
        console.log('An exception occurred in a react component', error, info);
        // Send update responses to the server
        reportClientSideException(error, this.props.interview?.id);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            // Go to error page as fallback UI
            return <SurveyErrorPage onRedirect={this.resetErrorBoundary} />;
        }
        return this.props.children;
    }
}

const mapStateToProps = (state, props) => {
    return {
        interview: state.survey.interview
    };
};

export default connect(mapStateToProps)(ErrorBoundary);
