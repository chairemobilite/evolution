/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Outlet } from 'react-router';

/**
 * Root layout component for admin survey routes.
 * This component wraps all routes and provides a consistent layout structure.
 */
const AdminRootLayout: React.FC = () => <Outlet />;

export default AdminRootLayout;
