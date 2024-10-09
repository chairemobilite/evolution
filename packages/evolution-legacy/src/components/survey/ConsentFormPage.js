/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import Markdown            from 'react-markdown';
import { withTranslation } from 'react-i18next';
import { connect }         from 'react-redux';
import moment              from 'moment-business-days';

import { startRegister } from 'evolution-frontend/lib/actions/Auth';
import config            from 'chaire-lib-common/lib/config/shared/project.config';
import Button            from 'evolution-frontend/lib/components/survey/Button';

class ConsentFormPage extends React.Component { 
    constructor(props) {
      
      super(props);

      this.widgetStatus = {
        isVisible: true
      };
  
      this.widgetConfig = {
        action: (callbacks, interview, path, section, sections, saveCallback) => {

          if (config.loginFromUrl) {
            
            const params = new URLSearchParams(this.props.location.search);
            this.setState(() => ({ error: null }));
            const generatePassword = (Math.floor((Math.random() * 800000)) + 100000).toString();
            if ( params.get(config.loginFromUrlMapping.usernameOrEmail) ){
              let username = params.get(config.loginFromUrlMapping.usernameOrEmail)
              for (let property in config.loginFromUrlMapping) {
                if (params.get(config.loginFromUrlMapping[property])){
                  {property === 'usernameOrEmail'? null : username += '_?'+property+'_'+params.get(config.loginFromUrlMapping[property])}
                }
              } 
              this.props.startRegister(
                {
                  usernameOrEmail  : username,
                  generatedPassword: generatePassword,
                  password         : config.loginFromUrlMapping.password ? params.get(config.loginFromUrlMapping.password) : generatePassword
                },
                this.props.history);  
              }
            } 

            else if (config.loginWithoutUsername) {

              this.setState(() => ({ error: null }));
              const generatePassword = (Math.floor((Math.random() * 800000)) + 100000).toString();
              const username = moment().unix().toString()
              this.props.startRegister(
                {
                  usernameOrEmail  : username,
                  generatedPassword: generatePassword,
                  password         : generatePassword
                },
                this.props.history); 
            }
            
          else {
            config.isPartTwo === true ? this.props.history.push('/login') : this.props.history.push('/register');
          }      
        }
      };
    }
  
    render(){
      const lng = this.props.i18n.language;
      return (
        <div className="survey">
          <div style={{width: '100%', margin: '0 auto', maxWidth: '40em', padding: '0 1rem'}}>
            <form 
              className = "apptr__form"
              id        = "survey_form"
            >
              {config.logoConsentFormPaths && <div className="main-logo center"><img src={config.logoConsentFormPaths[this.props.i18n.language]} style={{width: '40%'}} alt="Logo" /></div>}
              {config.consentFormPage && <div dangerouslySetInnerHTML={{__html: this.props.t(`survey:consentFormPage:consentForm`)}} />}
              {config.showStartButtonConsentFormPage !== true && <Button
                widgetConfig = {this.widgetConfig}
                widgetStatus = {this.widgetStatus}
                label        = {config.costumHomePageButtonLabel ? this.props.t(`survey:homepage:start`) : this.props.t(`auth:Start`)}
              />}
            </form>
          </div>

        </div>
      );
  
    }
    
  }

  const mapDispatchToProps = (dispatch, props) => ({
    startRegister: (data, history) => dispatch(startRegister(data, props.history))
  });
  
  export default connect(undefined, mapDispatchToProps)(withTranslation()(ConsentFormPage));