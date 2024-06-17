/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

export default function sectionTemplate(WrappedComponent) {

  // FIXME: There's not much in this HOC, see if we can remove it, what's this afterLoad function?
  class SectionTemplateHOC extends React.Component {

    constructor(props) {
      super(props);

      if (props.afterLoad === 'function')
      {
        props.afterLoad = props.afterLoad.bind(props);
      }
      
    }
    
    render() {
      return <WrappedComponent {...this.props}     
      />;
    }
  
  }

  return SectionTemplateHOC;
  
}
