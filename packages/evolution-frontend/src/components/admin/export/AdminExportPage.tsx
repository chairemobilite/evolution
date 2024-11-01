/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslationProps } from 'react-i18next';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { History } from 'history';
import moment from 'moment';
import ExportInterviewData from './ExportInterviewData';

type AdminExportPageProps = {
    isAuthenticated: boolean;
    user: CliUser;
    history: History;
} & WithTranslationProps;

class AdminExportPage extends React.Component<AdminExportPageProps> {
    constructor(props: AdminExportPageProps) {
        super(props);
        this.state = {
            lastUpdateAt: undefined
        };
        if (this.props.isAuthenticated && this.props.user.is_admin) {
            this.props.history.push('/admin/export');
        }
        this.onUpdate = this.onUpdate.bind(this);
    }

    onUpdate() {
        this.setState({
            lastUpdateAt: moment().unix()
        });
    }

    render() {
        return (
            <div className="admin">
                <ExportInterviewData />
            </div>
        );
    }
}

export default withTranslation()(AdminExportPage);
