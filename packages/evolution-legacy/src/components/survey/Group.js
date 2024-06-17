/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle }    from '@fortawesome/free-solid-svg-icons/faPlusCircle';
import _get                from 'lodash/get';
import sortBy              from 'lodash/sortBy';
import _cloneDeep from 'lodash/cloneDeep';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import GroupedObject from './GroupedObject';
import { checkConditional } from 'evolution-frontend/lib/actions/utils/Conditional';

export class Group extends React.Component {
  constructor(props) {
    super(props);
    //this.state              = {
    //  preloaded: false
    //};
    this.onAddGroupedObject = this.onAddGroupedObject.bind(this);
    this.groupedObjects     = this.groupedObjects.bind(this);
  }
  
  onAddGroupedObject(sequence) {
    const path = this.props.path;
    const startAddGroupedObjects = this.props.startAddGroupedObjects;
    return function(e) {
      if (e)
      {
        e.preventDefault();
      }
      startAddGroupedObjects(1, sequence, path);
    };
  }
  
  groupedObjects() {
    const widgetConfig = this.props.surveyContext.widgets[this.props.shortname];
    let groupedObjects = {};
    if (this.props.interview && this.props.interview.responses)
    {
      const allGroupedObjects = _get(this.props.interview.responses, this.props.path, {});
      let groupedObjects = {};
      if (typeof widgetConfig.filter === 'function')
      {
        groupedObjects = widgetConfig.filter(this.props.interview, allGroupedObjects);
      }
      else
      {
        groupedObjects = allGroupedObjects;
      }
      return sortBy(Object.values(groupedObjects),['_sequence']);
    }
    return groupedObjects;
  }

  render() {
    surveyHelper.devLog('%c rendering group ' + this.props.shortname, 'background: rgba(0,255,0,0.2);');
    const widgetConfig = this.props.surveyContext.widgets[this.props.shortname];
    if (!checkConditional(widgetConfig.conditional, this.props.interview, this.props.path, this.props.customPath)[0]) {
        return null;
    }
    const groupedObjects         = this.groupedObjects();
    const widgetsComponents      = [];
    const parentObjectIds        = _cloneDeep(this.props.parentObjectIds) || {};
    groupedObjects.forEach(function(groupedObject, index) {
      parentObjectIds[widgetConfig.shortname] = groupedObject._uuid;
      let path = `${this.props.path}.${groupedObject._uuid}`;
      
      for (const parentGroupShortname in parentObjectIds)
      {
        path.split('{'+parentGroupShortname+'}').join(parentObjectIds[parentGroupShortname]);
      }
      const showThisGroupedObject = surveyHelper.parseBoolean(this.props.groupConfig.groupedObjectConditional, this.props.interview, path, this.props.user, true);
      if (showThisGroupedObject)
      {
        widgetsComponents.push(
          <GroupedObject
            groupConfig                 = {this.props.groupConfig}
            groupsConfig                = {this.props.groupsConfig}
            path                        = {path}
            shortname                   = {this.props.shortname}
            loadingState                = {this.props.loadingState}
            objectId                    = {groupedObject._uuid}
            parentObjectIds             = {parentObjectIds}
            key                         = {groupedObject._uuid}
            sequence                    = {groupedObject['_sequence']}
            section                     = {this.props.section}
            interview                   = {this.props.interview}
            user                        = {this.props.user}
            openQuestionModal           = {this.props.openQuestionModal}
            closeQuestionModal          = {this.props.closeQuestionModal}
            isInsideModal               = {this.props.isInsideModal}
            questionModalPath           = {this.props.questionModalPath}
            startUpdateInterview        = {this.props.startUpdateInterview}
            startAddGroupedObjects      = {this.props.startAddGroupedObjects}
            startRemoveGroupedObjects   = {this.props.startRemoveGroupedObjects}
          />
        );
      }
    }, this);
    
    const showTitle         = surveyHelper.parseBoolean(this.props.groupConfig.showTitle, this.props.interview, this.props.path, this.props.user);
    const showAddButton     = this.props.loadingState === 0 && surveyHelper.parseBoolean(this.props.groupConfig.showGroupedObjectAddButton, this.props.interview, this.props.path, this.props.user);
    const addButtonLabel    = surveyHelper.parseString(this.props.groupConfig.groupedObjectAddButtonLabel ? (this.props.groupConfig.groupedObjectAddButtonLabel[this.props.i18n.language] || this.props.groupConfig.groupedObjectAddButtonLabel) : null, this.props.interview, this.props.path) || this.props.t(`survey:${widgetConfig.shortname}:addGroupedObject`);
    const addButtonLocation = this.props.groupConfig.addButtonLocation || 'bottom';
    const addButtonSize     = this.props.groupConfig.addButtonSize     || 'large';
    return (
      <section className="survey-group">
        <div className="content-container">
          <div className="survey-group__content">
            {showTitle && <h2 className="survey-group__title">{ widgetConfig.groupName[this.props.i18n.language] }</h2>}
            {showAddButton && (addButtonLocation === 'top' || addButtonLocation === 'both') && <div className="center">
              {showAddButton && <button
                type      = "button"
                className = {`button blue center ${addButtonSize}`}
                onClick   = {this.onAddGroupedObject(1)}
              >
                <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                {addButtonLabel}
              </button>}
            </div>}
            {widgetsComponents}
            {showAddButton && (addButtonLocation === 'bottom' || (widgetsComponents.length > 0 && addButtonLocation === 'both')) && <div className="center">
              {showAddButton && <button
                type      = "button"
                className = {`button blue center ${addButtonSize}`}
                onClick   = {this.onAddGroupedObject(-1)}
              >
                <FontAwesomeIcon icon={faPlusCircle} className="faIconLeft" />
                {addButtonLabel}
              </button>}
            </div>}
          </div>
        </div>
      </section>
    )
  }
}

export default withTranslation()(withSurveyContext(Group))