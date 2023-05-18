/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                from 'react';
import { withTranslation }  from 'react-i18next';
import Markdown             from 'react-markdown';
import { FontAwesomeIcon }  from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import { faPlusSquare }     from '@fortawesome/free-solid-svg-icons/faPlusSquare';
import { faMinusSquare }    from '@fortawesome/free-solid-svg-icons/faMinusSquare';
import { faMap }            from '@fortawesome/free-solid-svg-icons/faMap';
import isEqual              from 'lodash.isequal';

import * as surveyHelper    from 'evolution-common/lib/utils/helpers';
import InputLoading         from 'evolution-frontend/lib/components/inputs/InputLoading';
import InputString          from 'evolution-frontend/lib/components/inputs/InputString';
import InputMapPoint        from 'evolution-frontend/lib/components/inputs/InputMapPoint';
import InputMapFindPlace    from 'evolution-frontend/lib/components/inputs/InputMapFindPlace';
import InputMapFindPlacePhotonOsm from './input/InputMapFindPlacePhotonOsm';
import InputDatePicker      from 'evolution-frontend/lib/components/inputs/InputDatePicker';
import InputRadio           from 'evolution-frontend/lib/components/inputs/InputRadio';
import InputCheckbox        from 'evolution-frontend/lib/components/inputs/InputCheckbox';
import InputRange           from 'evolution-frontend/lib/components/inputs/InputRange'
import InputButton          from 'evolution-frontend/lib/components/inputs/InputButton';
import InputSelect          from 'evolution-frontend/lib/components/inputs/InputSelect';
import InputMultiselect     from 'evolution-frontend/lib/components/inputs/InputMultiselect';
import InputTime            from 'evolution-frontend/lib/components/inputs/InputTime';
import InputText            from 'evolution-frontend/lib/components/inputs/InputText';
import SimpleModal          from 'evolution-frontend/lib/components/modal/SimpleModal';
import Modal                from 'react-modal';
import { checkValidations } from 'evolution-frontend/lib/actions/utils';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';

export class Question extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      helperModalIsOpen: false,
      modalIsOpen:       props.widgetStatus.modalIsOpen
    }
    this.onValueChange        = this.onValueChange.bind(this);
    //this.updateInterview      = /*_.debounce(*/this.updateInterview.bind(this);/*, 500);*/
    this.inputRef             = React.createRef(); // create a ref for input focus when clicking anywhere in question container
    this.openHelperModal      = this.openHelperModal.bind(this);
    this.closeHelperModal     = this.closeHelperModal.bind(this);
    //this.afterOpenHelperModal = this.afterOpenHelperModal.bind(this);
    //this.openModal            = this.openModal.bind(this);
    this.closeModal           = this.closeModal.bind(this);
    //this.afterOpenModal       = this.afterOpenModal.bind(this);
    this.toggleCollapse       = this.toggleCollapse.bind(this);
    //this.toggleDisable        = this.toggleDisable.bind(this);
  }

  openHelperModal(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({helperModalIsOpen: true});
  }

  closeHelperModal(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({helperModalIsOpen: false});
  }

  closeModal(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState({modalIsOpen: false});
  }

  //afterOpenHelperModal() {
  //  // references are now sync'd and can be accessed.
  //}

  getInputComponent(inputType) {
    if (this.props.interview && this.props.interview.responses)
    {
      switch (inputType)
      {
        case 'string'      : return InputString;
        case 'mapPoint'    : return InputMapPoint;
        case 'mapFindPlace': return InputMapFindPlace;
        case 'mapFindPlacePhotonOsm': return InputMapFindPlacePhotonOsm;
        case 'radio'       : return InputRadio;
        case 'checkbox'    : return InputCheckbox;
        case 'button'      : return InputButton;
        case 'select'      : return InputSelect;
        case 'multiselect' : return InputMultiselect;
        case 'time'        : return InputTime;
        case 'text'        : return InputText;
        case 'datePicker'  : return InputDatePicker;
        case 'slider'      : return InputRange;
        default            : return InputString;
      }
    }
    else
    {
      return InputLoading;
    }
    
  }

  onValueChange(e, customValue = undefined)
  {
    if (e && e.stopPropagation) {
      e.stopPropagation();
      //e.persist(); // for debounce
    }

    const widgetStatus            = this.props.widgetStatus;
    const widgetConfig            = this.props.widgetConfig;
    const previousValue           = widgetStatus.value;
    const previousCustomValue     = widgetStatus.customValue;
    const value                   = e.target ? e.target.value : e; //InputDatePicker call onValueChange with e=value
    const parsedValue             = surveyHelper.parseValue(value, widgetConfig.datatype);
    const parsedCustomValue       = surveyHelper.parseValue(customValue, widgetConfig.customDatatype);
    const [isValid, errorMessage] = checkValidations(widgetConfig.validations, parsedValue, parsedCustomValue, this.props.interview, this.props.path, this.props.customPath);
    
    const valuesByPath = {};
    let   needToUpdate = false;

    if (!isEqual(parsedValue,previousValue) && !(parsedValue === null && previousValue === undefined))
    {
      needToUpdate                                   = true;
      valuesByPath['validations.' + this.props.path] = isValid;
      valuesByPath['responses.'   + this.props.path] = parsedValue;
    }

    if (this.props.customPath && !isEqual(parsedCustomValue,previousCustomValue) && !(parsedCustomValue === null && previousCustomValue === undefined))
    {
      needToUpdate                                         = true;
      valuesByPath['validations.' + this.props.customPath] = isValid;
      valuesByPath['responses.'   + this.props.customPath] = parsedCustomValue;
    }

    if (needToUpdate || this.props.widgetConfig.inputType === 'button') // force update with buttons
    {
      let saveCallback = null;
      if (isValid && typeof widgetConfig.saveCallback === 'function')
      {
        saveCallback = (widgetConfig.saveCallback).bind(this);
      }
      this.props.startUpdateInterview(this.props.section, valuesByPath, null, null, saveCallback);
    }

    if (widgetConfig.isModal && this.state.modalIsOpen && isValid)
    {
      this.closeModal();
    }
  }
  
  toggleCollapse(e) {
    if (e)
    {
      e.preventDefault();
    }
    this.setState((prevState, props) => {
      return {
        isCollapsed: !(prevState.isCollapsed)
      }
    });
  }
  
  shouldComponentUpdate(nextProps, nextState) {
    // we need to re-render whenever loading state changes for widgets with buttons, like mapFindPlace:
    // TODO: find all buttons inside questions to make sure they are correctly re-render before click event is triggered.
    // See Button.js for more comments about this issue
    return nextProps.widgetConfig.inputType === 'mapFindPlace' || nextProps.loadingState === 0;
  }

  render() {
    
    const widgetStatus = this.props.widgetStatus;

    if (!widgetStatus.isVisible && !this.props.surveyContext.devMode)
    {
      return null;
    }
    // We're here, if the widget is not visible, we're in devMode, so disable it
    const disabled = !widgetStatus.isVisible;
    
    surveyHelper.devLog('%c rendering question ' + this.props.path, 'background: rgba(255,255,0,0.1); font-size: 7px;')
    
    const id               = `survey-question__${this.props.path}`;
    const customId         = this.props.customPath ? `survey-question__${this.props.customPath}` : null;
    const widgetConfig     = this.props.widgetConfig;
    const i18n             = this.props.i18n;
    let inputType          = null;
    if (typeof this.props.widgetConfig.inputType === 'function')
    {
      inputType = this.props.widgetConfig.inputType(this.props.interview, this.props.path);
    }
    else
    {
      inputType = this.props.widgetConfig.inputType;
    }
    const InputComponent   = this.getInputComponent(inputType);
    const label            = surveyHelper.translateString(widgetConfig.label, this.props.i18n, this.props.interview, this.props.path, this.props.user);
    const twoColumns       = typeof widgetConfig.twoColumns === 'function' ? widgetConfig.twoColumns(this.props.interview, this.props.path) : widgetConfig.twoColumns;
    const showErrorMessage = widgetStatus.isResponded === true && widgetStatus.isValid === false && !disabled && widgetStatus.errorMessage ? true : false;
    const content = (
      <div 
        style={{position: 'relative'}}
        className={`apptr__form-container${twoColumns ? ' two-columns' : ''}${widgetStatus.isDisabled || disabled ? ' disabled' : ''} question-type-${inputType}${widgetStatus.isEmpty ? ' question-empty' : ' question-filled'}${!widgetStatus.isEmpty && widgetStatus.isValid === true ? ' question-valid' : (showErrorMessage === true ? ' question-invalid' : "")}`}
        onClick={() => {this.inputRef.current && typeof this.inputRef.current.focus === 'function' ? this.inputRef.current.focus() : null}}
      >
        <div
          className={`apptr__form-label-container${twoColumns ? ' two-columns' : ''}${widgetConfig.align === 'center' ? ' align-center' : ''}`}
        >
          <label htmlFor={ id } onClick={widgetStatus.isCollapsed ? this.toggleCollapse : () => {}}>
            { widgetConfig.containsHtml ? 
              <div dangerouslySetInnerHTML={{__html: label}}/> 
            :
              <Markdown className="label" source={label} />
            }
          </label>
          { showErrorMessage === true && <p className="apptr__form-error-message">{widgetConfig.containsHtml ? <span dangerouslySetInnerHTML={{__html: surveyHelper.translateString(widgetStatus.errorMessage, this.props.i18n, this.props.interview, this.props.path)}}/> : surveyHelper.translateString(widgetStatus.errorMessage, this.props.i18n, this.props.interview, this.props.path) }</p>}
          { /* helpPopup below: */ }
          {    widgetConfig.helpPopup 
            && widgetConfig.helpPopup.title 
            && widgetConfig.helpPopup.content
            && (<div>
                {this.state.helperModalIsOpen && <SimpleModal
                  isOpen       = {true}
                  closeModal   = {this.closeHelperModal}
                  text         = {surveyHelper.translateString(widgetConfig.helpPopup.content, this.props.i18n, this.props.interview, this.props.path, this.props.user)}
                  title        = {surveyHelper.translateString(widgetConfig.helpPopup.title, this.props.i18n, this.props.interview, this.props.path, this.props.user)}
                  containsHtml = {widgetConfig.helpPopup.containsHtml}
                  action       = {widgetConfig.action}
                />}
                <button
                  type      = "button"
                  className = "button helper-popup blue small"
                  onClick   = {this.openHelperModal}
                  tabIndex  = {-1}
                >
                  <FontAwesomeIcon icon={faQuestionCircle} className="faIconLeft" />
                  {surveyHelper.translateString(widgetConfig.helpPopup.title, this.props.i18n, this.props.interview, this.props.path, this.props.user)}
                </button>
              </div>)
            }
        </div>
        {!widgetStatus.isCollapsed && (!widgetStatus.isDisabled || (widgetStatus.isDisabled && !widgetConfig.canBeCollapsed)) && <div className={`apptr__form-input-container ${twoColumns ? 'two-columns' : ''}`}>
          {<InputComponent
            widgetConfig                = {widgetConfig}
            widgetStatus                = {widgetStatus}
            section                     = {this.props.section}
            loadingState                = {this.props.loadingState}
            value                       = {widgetStatus.value}
            customValue                 = {widgetStatus.customValue}
            onValueChange               = {this.onValueChange}
            onCustomValueChange         = {this.onCustomValueChange}
            inputRef                    = {this.inputRef}
            path                        = {this.props.path}
            customId                    = {customId}
            customPath                  = {this.props.customPath}
            interview                   = {this.props.interview}
            user                        = {this.props.user}
            id                          = {id}
            language                    = {this.props.i18n.language}
            closeQuestionModal          = {this.props.closeQuestionModal}
            openConfirmModal            = {this.props.openConfirmModal}
            closeConfirmModal           = {this.props.closeConfirmModal}
            confirmModalOpenedShortname = {this.props.confirmModalOpenedShortname}
            isInsideModal               = {widgetConfig.isModal === true}
            questionModalPath           = {this.props.questionModalPath}
            startUpdateInterview        = {this.props.startUpdateInterview}
            startAddGroupedObjects      = {this.props.startAddGroupedObjects}
            startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
            key                   = {widgetStatus.currentUpdateKey}
          />}
        </div>}
      </div>
    );

    if (widgetConfig.isModal)
    {
      if (!this.state.modalIsOpen)
      {
        return null;
      }
      Modal.setAppElement('#app');
      return (<Modal
        isOpen           = {true}
        onRequestClose   = {this.props.closeQuestionModal}
        className        = "react-modal"
        overlayClassName = "react-modal-overlay"
        contentLabel     = {widgetConfig.title || ''}
      >
        {content}
      </Modal>);
    }
    else
    {
      return content;
    }

  }
}

export default withTranslation()(withSurveyContext(Question))