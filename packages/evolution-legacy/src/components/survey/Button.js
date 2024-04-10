/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import ConfirmModal         from './modal/ConfirmModal';
import * as surveyHelper    from 'evolution-common/lib/utils/helpers';

export class Button extends React.Component {
  constructor(props) {
    super(props);
    this.onClickButton = this.onClickButton.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.state = {
        wasMouseDowned: false,
    };
  }

  componentDidUpdate(prevProps) {
    // wait for any field to blur (unfocus) and save and/or validate, then trigger click:
    if (this.props.widgetConfig.hideWhenRefreshing) {
        if (this.props.loadingState === 0 && prevProps.loadingState > 0 && this.state.wasMouseDowned === true) {
            // this is a hack because it will ignore mouseup if triggered and 
            // will run clickButton even if the mouse was not upped.
            // but there is no other way to wait for blur to complete with fast clicks
            // (fast clicks with onBlur do not trigger mouseup)
            this.setState({ wasMouseDowned: false }, this.onClickButton);
        }
    }
  }

  onMouseDown(e) {
    //e.preventDefault();
    // preventing default would ignore active input blur
    this.setState({wasMouseDowned : true});
  }

  onMouseUp(e) {
    e.preventDefault();
    if (!this.props.widgetConfig.hideWhenRefreshing) {
        this.onClickButton();
    } else {
        this.setState({ wasMouseDowned: false }, this.onClickButton);
    }
  }

  onClickButton() {
    const hasConfirmPopup         = this.props.widgetConfig.confirmPopup && this.props.widgetConfig.confirmPopup.shortname;
    const confirmPopupConditional = hasConfirmPopup ? surveyHelper.parseBoolean(this.props.widgetConfig.confirmPopup.conditional, this.props.interview, this.props.path, this.props.user) : true;

    if (hasConfirmPopup && confirmPopupConditional === true)
    {
      this.props.openConfirmModal(this.props.widgetConfig.confirmPopup.shortname);
    }
    else
    {
      let saveCallback = this.props.saveCallback || this.props.widgetConfig.saveCallback;
      if (typeof saveCallback === 'function')
      {
        saveCallback = saveCallback.bind(this);
      }
      this.props.widgetConfig.action.call(this, this.props.section, this.props.surveyContext.sections, saveCallback);
    }

  }
  
  render() {
    
    const widgetConfig = this.props.widgetConfig;
    if(!this.props.widgetStatus.isVisible)
    {
      return null;
    }

    let saveCallback = this.props.saveCallback || this.props.widgetConfig.saveCallback;
    if (typeof saveCallback === 'function')
    {
      saveCallback = saveCallback.bind(this);
    }

    const isLoading = widgetConfig.hideWhenRefreshing && this.props.loadingState > 0;
    const buttonColor = (widgetConfig.color || 'green');
    return (
      <div className={widgetConfig.align || 'center'}>
        <button
          type = "button"
          className = {`survey-section__button button ${buttonColor} ${widgetConfig.size || 'large'} ${isLoading ? 'disabled' : ''}`}
          onMouseDown = {this.onMouseDown}
          onMouseUp = {this.onMouseUp}
          onKeyUp = {(e) => { if (e.key === 'enter' || e.key === 'space' || e.which === 13 || e.which === 32) { this.onClickButton(); } else { return; } }}
          disabled = {isLoading}
        >
          {widgetConfig.icon && <FontAwesomeIcon icon={widgetConfig.icon} className="faIconLeft" />}
          {surveyHelper.translateString(this.props.label || widgetConfig.label, this.props.i18n, this.props.interview, this.props.path)}
        </button>
        { /* confirmPopup below: */ }
        {    widgetConfig.confirmPopup 
          && widgetConfig.confirmPopup.shortname 
          && this.props.confirmModalOpenedShortname === widgetConfig.confirmPopup.shortname
          && widgetConfig.confirmPopup.content
          && (<div>
              <ConfirmModal
                isOpen                      = {true}
                closeModal                  = {this.props.closeConfirmModal}
                text                        = {surveyHelper.translateString(widgetConfig.confirmPopup.content, this.props.i18n, this.props.interview, this.props.path)}
                title                       = {widgetConfig.confirmPopup.title ? surveyHelper.translateString(widgetConfig.confirmPopup.title, this.props.i18n, this.props.interview, this.props.path) : null}
                cancelAction                = {widgetConfig.confirmPopup.cancelAction}
                showCancelButton            = {widgetConfig.confirmPopup.showCancelButton !== false}
                showConfirmButton           = {widgetConfig.confirmPopup.showConfirmButton !== false}
                cancelButtonLabel           = {widgetConfig.confirmPopup.cancelButtonLabel ? surveyHelper.translateString(widgetConfig.confirmPopup.cancelButtonLabel, this.props.i18n, this.props.interview, this.props.path) : undefined}
                confirmButtonLabel          = {widgetConfig.confirmPopup.confirmButtonLabel ? surveyHelper.translateString(widgetConfig.confirmPopup.confirmButtonLabel, this.props.i18n, this.props.interview, this.props.path) : undefined}
                cancelButtonColor           = {widgetConfig.confirmPopup.cancelButtonColor}
                confirmButtonColor          = {widgetConfig.confirmPopup.confirmButtonColor}
                containsHtml                = {widgetConfig.containsHtml}
                confirmAction               = {widgetConfig.action ? widgetConfig.action.bind(this) : null}
                confirmActionValidateButton = {widgetConfig.confirmPopup.confirmActionValidateButton ? true : null}
                section                     = {this.props.section}
                sections                    = {this.props.surveyContext.sections}
              />
            </div>)
          }
      </div>
    );
  }
}



export default withTranslation()(withSurveyContext(Button))