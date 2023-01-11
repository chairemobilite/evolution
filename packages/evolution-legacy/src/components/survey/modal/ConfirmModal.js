/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import Modal               from 'react-modal';
import { withTranslation } from 'react-i18next';
import Markdown            from 'react-markdown';

export class ConfirmModal extends React.Component{
  
  constructor(props) {
    super(props);
    if (process.env.NODE_ENV !== 'test')
    {
      Modal.setAppElement('#app');
    }
    this.confirm = this.confirm.bind(this);
    this.cancel  = this.cancel.bind(this);
  }
  
  confirm() {
    if (typeof this.props.confirmAction === 'function')
    {
      if (this.props.confirmActionValidateButton) {
        (this.props.confirmAction.call(this, this.props.section, this.props.sections))
      } else {
        (this.props.confirmAction.bind(this))();
      }
    }
    this.props.closeModal();
  }
  
  cancel() {
    if (typeof this.props.cancelAction === 'function')
    {
      (this.props.cancelAction.bind(this))();
    }
    this.props.closeModal();
  }
  
  render(){
    
    return (
      <Modal
        isOpen           = {this.props.isOpen}
        onRequestClose   = {this.cancel}
        className        = "react-modal"
        overlayClassName = "react-modal-overlay"
        contentLabel     = {this.props.title}
      >
        <div>
          {this.props.title && <h3 className="center"><Markdown source={this.props.title} /></h3>}
          { this.props.containsHtml ? 
              <div dangerouslySetInnerHTML={{__html: this.props.text}}/> 
          :
            <Markdown className="confirm-popup" source={this.props.text} />
          }
          <div className={`survey-question__input-button-group-container align-center`}>
            {this.props.showCancelButton  !== false && <div className="center"><button className={`button ${this.props.cancelButtonColor  || 'grey'}`} onClick={this.cancel }>{this.props.cancelButtonLabel  ? (this.props.cancelButtonLabel[this.props.i18n.language]  ? this.props.cancelButtonLabel[this.props.i18n.language]  : this.props.cancelButtonLabel)  : this.props.t('main:Cancel') }</button></div>}
            {this.props.showConfirmButton !== false && <div className="center"><button className={`button ${this.props.confirmButtonColor || 'blue'}`} onClick={this.confirm}>{this.props.confirmButtonLabel ? (this.props.confirmButtonLabel[this.props.i18n.language] ? this.props.confirmButtonLabel[this.props.i18n.language] : this.props.confirmButtonLabel) : this.props.t('main:Confirm')}</button></div>}
          </div>
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(ConfirmModal)


