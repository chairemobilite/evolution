/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

interface AdminErrorProps {
    // No props required
}

interface AdminErrorState {
    hasError: boolean;
}

/**
 * Error boundary component to catch exceptions in react components and display
 * a fallback UI.
 */
export class AdminErrorBoundary extends React.Component<
    React.PropsWithChildren<AdminErrorProps & WithTranslation>,
    AdminErrorState
> {
    constructor(props: React.PropsWithChildren<AdminErrorProps & WithTranslation>) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // Display fallback UI
        this.setState({ hasError: true });
        console.log('An exception occurred in a react component', error, info);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            // Go to error page as fallback UI
            return <div>{this.props.t('admin:UnknownError')}</div>;
        }
        return this.props.children;
    }
}

export default withTranslation()(AdminErrorBoundary);
