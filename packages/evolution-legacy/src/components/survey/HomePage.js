/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { connect }         from 'react-redux';
import moment              from 'moment-business-days';
import {v4 as uuidv4}      from 'uuid'

import { startRegister } from '../../actions/shared/auth';
import config            from 'chaire-lib-common/lib/config/shared/project.config';
import ConsentAndStartForm from 'evolution-frontend/lib/components/pageParts/ConsentAndStartForm';
import { InterviewContext } from 'evolution-frontend/lib/contexts/InterviewContext';

class HomePage extends React.Component { 
  static contextType = InterviewContext;

  constructor(props) {
    
    super(props);

    if (this.props.isAuthenticated === true) {
      const goToPage = this.props.user && this.props.user.homePage ? this.props.user.homePage : '/survey';
      // Avoid infinite loops
      this.props.history.push(goToPage === '' || goToPage === '/' ? '/survey' : goToPage);
    }

  }

  componentDidMount() {
    // If there is a query string, add to the responses
    if (this.props.location.search && this.props.location.search !== '') {
        const { state, dispatch } = this.context;
        if (state.status !== 'entering') {
            dispatch({ type: 'enter', queryData: new URLSearchParams(this.props.location.search) });
        }
    }
    
  }

  afterClick = () => {
    if (config.loginFromUrl)
    {

      const params = new URLSearchParams(this.props.location.search);
      this.setState(() => ({ error: null }));
      const generatePassword = (Math.floor((Math.random() * 800000)) + 100000).toString();
      
      if ( params.get(config.loginFromUrlMapping.usernameOrEmail) ){ //verify thaht there is a username in the url
        let username = params.get(config.loginFromUrlMapping.usernameOrEmail)
        for (let property in config.loginFromUrlMapping) {
          if (params.get(config.loginFromUrlMapping[property])){
            {property === 'usernameOrEmail'? null : username += '_?'+property+'_'+params.get(config.loginFromUrlMapping[property])}
          }
        } 

        if (!username) { //if no name --> go to register
          this.props.history.push('/register');
        } else { //if already login and same username --> go to survey otherwise log the user
          
          fetch('/verifyAuthentication', { credentials: 'include' }).then((response) => {
            if (response.status === 200) {
              response.json().then((body) => {
                if (body.status === 'Login successful!' && body.user.username && body.user.username === username) {
                  this.props.history.push('/survey');
                } else { // case when user is not register or the username from url and the fetch are not the same
                  this.props.startRegister(
                    {
                      usernameOrEmail  : username,
                      generatedPassword: generatePassword,
                      password         : config.loginFromUrlMapping.password ? params.get(config.loginFromUrlMapping.password) : generatePassword
                    },
                    this.props.history
                  );
                }
              });
            } else { // case when response status is not 200
              if (config.allowRegistration !== false)
              {
                this.props.startRegister(
                  {
                    usernameOrEmail  : username,
                    generatedPassword: generatePassword,
                    password         : config.loginFromUrlMapping.password ? params.get(config.loginFromUrlMapping.password) : generatePassword
                  },
                  this.props.history
                );
              }
              else
              {
                this.props.history.push('/login');
              } 
            }
          });
        }
      } else { // if no username in the url go to register
        if (config.allowRegistration !== false)
        {
          this.props.history.push('/register');
        }
        else
        {
          this.props.history.push('/login');
        }
      }
    } 
    else if (config.loginWithoutUsername) 
    {

      if (config.allowRegistration !== false)
      {
        this.setState(() => ({ error: null }));
        const generatePassword = (Math.floor((Math.random() * 800000)) + 100000).toString();
        const username = uuidv4();
        this.props.startRegister(
          {
            usernameOrEmail  : username,
            generatedPassword: generatePassword,
            password         : generatePassword
          },
          this.props.history
        );
      }
      else
      {
        this.props.history.push('/login');
      }
    }
    else
    {
      config.isPartTwo === true || config.allowRegistration === false ? this.props.history.push('/login') : this.props.history.push('/register');
    }  
  }

  render(){

    return (
      <div className="survey">
        <div style={{width: '100%', margin: '0 auto', maxWidth: '60em',}}>
        {config.introBanner && config.bannerPaths && <div className="main-logo center"><img src={config.bannerPaths[this.props.i18n.language]} style={{width: '100%'}} alt="Banner" /></div>}
          <div style={{width: '100%', margin: '0 auto', maxWidth: '30em', padding: '0 1rem'}}>

            <form 
              className = "apptr__form"
              id        = "survey_form"
              //onSubmit  = {this.onSubmit}
            >
              {!config.introLogoAfterStartButton && config.logoPaths && <div className="main-logo center"><img src={config.logoPaths[this.props.i18n.language]} style={{width: '100%'}} alt="Logo" /></div>}
              {config.isPartTwo === true ? <div dangerouslySetInnerHTML={{__html: this.props.t(`survey:homepage:pageTwoIntroduction`)}} /> : <div dangerouslySetInnerHTML={{__html: this.props.t(`survey:homepage:introduction`)}} /> }
              {config.hideStartButtonOnHomePage !== true && <ConsentAndStartForm
                afterClicked = {this.afterClick}
              />}
              {config.introLogoAfterStartButton && config.logoPaths && <div className="main-logo center"><img src={config.logoPaths[this.props.i18n.language]} style={{width: '100%'}} alt="Logo" /></div>}
              {config.introductionTwoParagraph && <div dangerouslySetInnerHTML={{__html: this.props.t(`survey:homepage:introductionParagraphTwo`)}} />}
              <div className="center">{ config.languages.map((language) => {
                  return this.props.i18n.language !== language ? (<a 
                      href      = "#"
                      className = "em"
                      key       = {`header__nav-language-${language}`}
                      onClick   = {(e) => {
                        e.preventDefault();
                        this.props.i18n.changeLanguage(language);
                        moment.locale(this.props.i18n.language);
                      }}
                    >
                    {config.languageNames[language]}
                    </a>) : "";
                }) }
              </div>
            </form>
          </div>
        </div>
      </div>
    );

  }
  
}

const mapStateToProps = (state, props) => {
    return {
      user           : state.auth.user,
      isAuthenticated: !!state.auth.isAuthenticated
    };
  };

const mapDispatchToProps = (dispatch, props) => ({
  startRegister: (data, history) => dispatch(startRegister(data, props.history))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(HomePage))