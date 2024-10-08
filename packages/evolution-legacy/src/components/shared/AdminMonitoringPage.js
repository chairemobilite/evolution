/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import Loadable            from 'react-loadable';
import Loader              from 'react-spinners/HashLoader';

//import config from 'chaire-lib-common/lib/config/shared/project.config';

const loader = function Loading(props) { 
  return (<Loader 
    sizeUnit = {"px"}
    size     = {30}
    color    = {'#aaaaaa'}
    loading  = {true}
  />);
};

const LoadableComponent = Loadable({
  loader: () => import('evolution-frontend/lib/components/admin/Monitoring'),
  loading: loader
});

class AdminMonitoringPage extends React.Component { 
  constructor(props) {
    
    super(props);
    
    if (this.props.isAuthenticated && this.props.user.is_admin) {
      this.props.history.push('/admin/monitoring');
    }

  }

  render(){
    
    return (
      <div className="admin">
        <LoadableComponent />
      </div>
    );

  }
  
}

export default withTranslation()(AdminMonitoringPage)