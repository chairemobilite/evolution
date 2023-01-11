/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { connect }         from 'react-redux';
import { withTranslation } from 'react-i18next';

import Button                  from './Button';
import config                  from 'chaire-lib-common/lib/config/shared/project.config';
import { startChangePassword } from '../../actions/shared/auth';

export class ChangePasswordPage extends React.Component {
  constructor(props) {
    super(props);
    if (!this.props.isAuthenticated) {
      this.props.history.push('/login');
    }
    this.state =  {
      password: '',
      passwordConfirmation: ''
    };

    this.onPasswordChange             = this.onPasswordChange.bind(this);
    this.onPasswordConfirmationChange = this.onPasswordConfirmationChange.bind(this);

    this.widgetStatus = {
      isVisible: true
    };

    this.widgetConfig = {
      action: function(section, sections, saveCallback) {
        if (!this.state.password)
        {
          this.setState(() => ({ error: this.props.t(['survey:auth:missingPassword', 'auth:missingPassword']) }));
        }
        else if (this.state.password !== this.state.passwordConfirmation)
        {
          this.setState(() => ({ error: this.props.t(['survey:auth:passwordsDoNotMatch', 'auth:passwordsDoNotMatch']) }));
        }
        else if (this.state.password && this.state.password.length < 8)
        {
          this.setState(() => ({ error: this.props.t(['survey:auth:passwordMustHaveAtLeastNCharacters', 'auth:passwordMustHaveAtLeastNCharacters'], {n: 8}) }));
        }
        else
        {
          this.setState(() => ({ error: null }));
          this.props.startChangePassword({
            password : this.state.password
          },this.props.history);
        }
      }.bind(this)
    };
  }

  onKeyPress(e) {
    if (e.which === 13 && e.target.tagName.toLowerCase() !== 'textarea' /* Enter */)
    {
      e.preventDefault();
      
    }
  }

  componentDidMount() {
    document.addEventListener("keydown", this.onKeyPress.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyPress.bind(this));
  }

  onPasswordChange(e) {
    const password = e.target.value;
    if(password)
    {
      this.setState(() => ({ password: password }));
    }
    else // allow empty string
    {
      this.setState(() => ({ password: "" }));
    }
  }

  onPasswordConfirmationChange(e) {
    const passwordConfirmation = e.target.value;
    if(passwordConfirmation)
    {
      this.setState(() => ({ passwordConfirmation: passwordConfirmation }));
    }
    else // allow empty string
    {
      this.setState(() => ({ passwordConfirmation: "" }));
    }
  }

  render() {

    let surveyContainerStyle = {};
    if (config.logoPaths)
    {
        surveyContainerStyle = {
            /*backgroundImage: `url(/dist/images/ornaments/ornament_wide_bottom_pale.svg), url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
            backgroundSize: "12rem, 15rem, 6rem",
            backgroundPosition: "center 1.8em, left 1rem bottom 1rem, right 1rem top 100.5%",
            backgroundRepeat: "no-repeat, no-repeat, no-repeat"*/
            backgroundImage: `url(${config.logoPaths[this.props.i18n.language]}), url(/dist/images/ornaments/ornament_flower_points_pale.svg)`,
            backgroundSize: "15rem, 6rem",
            backgroundPosition: "left 1rem bottom 1rem, right 1rem top 100.5%",
            backgroundRepeat: "no-repeat, no-repeat"
        };
    }

    return (
      <div className="survey" style={surveyContainerStyle}>
        <div style={{width: '100%', margin: '0 auto', maxWidth: '30em'}}>
          <form 
            className = "apptr__form"
            id        = "survey_form"
            //onSubmit  = {this.onSubmit}
          >
            <div className={`apptr__form-label-container center`}>
              <div className="apptr__form__label-standalone no-question">
                <p>{this.props.t(['survey:auth:pleaseChooseANewAPassword', 'auth:pleaseChooseANewPassword'])}</p>
              </div>
              { this.state.error && <p className="apptr__form-error-message no-question">{ this.state.error }</p>}
            </div>
            <div className={`apptr__form-container question-empty`}>
              <div className={`apptr__form-input-container`}>
                <div className={`apptr__form-label-container`}>
                  <label htmlFor="password">{this.props.t(['survey:auth:Password','auth:Password'])}</label>
                </div>
                <input
                  name        = "password"
                  type        = "password"
                  id          = "password"
                  className   = {`apptr__form-input apptr__input-string input-large`}
                  value       = {this.state.password}
                  onChange    = {this.onPasswordChange}
                />
              </div>
            </div>
            <div className={`apptr__form-container question-empty`}>
              <div className={`apptr__form-input-container`}>
                <div className={`apptr__form-label-container`}>
                  <label htmlFor="passwordConfirmation">{this.props.t(['survey:auth:PasswordConfirmation','auth:PasswordConfirmation'])}</label>
                </div>
                <input
                  name        = "passwordConfirmation"
                  type        = "password"
                  id          = "passwordConfirmation"
                  className   = {`apptr__form-input apptr__input-string input-large`}
                  value       = {this.state.passwordConfirmation}
                  onChange    = {this.onPasswordConfirmationChange}
                />
              </div>
            </div>
            <Button
              widgetConfig = {this.widgetConfig}
              widgetStatus = {this.widgetStatus}
              label        = {this.props.t(['survey:auth:Confirm',`auth:Confirm`])}
            />
          </form>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {isAuthenticated: state.auth.isAuthenticated};
};

const mapDispatchToProps = (dispatch, props) => ({
  startChangePassword: (data, history) => dispatch(startChangePassword(data, props.history))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ChangePasswordPage))