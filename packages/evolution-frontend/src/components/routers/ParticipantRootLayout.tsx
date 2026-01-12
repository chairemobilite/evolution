/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Outlet } from 'react-router';
import FloatingSupportForm from '../pageParts/FloatingSupportForm';

/**
 * Root layout component for participant survey routes.
 * This component wraps all routes and includes common elements like FloatingSupportForm.
 */
const ParticipantRootLayout: React.FC = () => (
    <>
        <Outlet />
        {/* Add the floating support form to be available on all pages */}
        <FloatingSupportForm />
    </>
);

export default ParticipantRootLayout;
