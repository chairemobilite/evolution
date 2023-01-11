/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

export default function sectionTemplate(WrappedComponent) {

  class SectionTemplateHOC extends React.Component {

    constructor(props) {
      super(props);

      this.state = {
        questionModalPath: null
      };
      
      if (props.afterLoad === 'function')
      {
        props.afterLoad = props.afterLoad.bind(props);
      }
      
      this.openQuestionModal               = this.openQuestionModal.bind(this);
      this.closeQuestionModal              = this.closeQuestionModal.bind(this);
    }

    openQuestionModal(path) {
      this.setState(function(oldState){
        return {
          questionModalPath: oldState.questionModalPath === null ? path : oldState.questionModalPath
        };
      });
    }

    closeQuestionModal(path) {
      this.setState((oldState) => ({
        questionModalPath: oldState.questionModalPath === path ? null : oldState.questionModalPath
      }));
    }
    
    render() {
      return <WrappedComponent {...this.props} 
        openQuestionModal               = {this.openQuestionModal}
        closeQuestionModal              = {this.closeQuestionModal}
        questionModalPath               = {this.state.questionModalPath}
      />;
    }
  
  }

  return SectionTemplateHOC;
  
}
