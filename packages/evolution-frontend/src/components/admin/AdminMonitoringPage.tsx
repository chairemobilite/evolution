/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslationProps } from 'react-i18next';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { History } from 'history';
import Monitoring from './Monitoring';

type AdminMonitoringPageProps = {
    isAuthenticated: boolean;
    user: UserAttributes;
    history: History;
} & WithTranslationProps;

class AdminMonitoringPage extends React.Component<AdminMonitoringPageProps> {
    constructor(props: AdminMonitoringPageProps) {
        super(props);

        if (this.props.isAuthenticated && this.props.user.is_admin) {
            this.props.history.push('/admin/monitoring');
        }
    }

    render() {
        return (
            <div className="admin">
                <Monitoring />
            </div>
        );
    }
}

export default withTranslation()(AdminMonitoringPage);
